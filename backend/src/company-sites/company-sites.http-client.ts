import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

import {
  NOT_FOUND_STATUS,
  OK_STATUS,
  RATE_LIMITED_STATUS,
  SERVER_ERROR_MIN_STATUS,
} from '../common/common.constants';
import { ACCEPT_HEADER, VACANCY_ACCEPT_HEADER_VALUE } from '../vacancies/vacancies.constants';
import type { VacancyRequestAttempt } from '../vacancies/vacancies.interfaces';
import { describeTransportError, fetchWithRetries } from '../vacancies/vacancy-retry.helpers';
import {
  COMPANY_SITE_JSON_ACCEPT_HEADER_VALUE,
  COMPANY_SITE_MAX_RETRIES_ENV_KEY,
  COMPANY_SITE_NOT_FOUND_MESSAGE,
  COMPANY_SITE_NOT_HTML_MESSAGE,
  COMPANY_SITE_NOT_JSON_MESSAGE,
  COMPANY_SITE_RATE_LIMITED_MESSAGE,
  COMPANY_SITE_TRANSPORT_ERROR_MESSAGE,
  COMPANY_SITE_UNEXPECTED_STATUS_MESSAGE,
} from './company-sites.constants';
import { parseJsonBody } from './company-sites.helpers';
import { CompanySiteRequestThrottle } from './company-sites.throttle';
import type {
  CompanySiteFetchResult,
  CompanySiteHtmlResult,
  CompanySiteJsonResult,
} from './company-sites.type';

/** URL, чей host не удаётся разобрать, не должен уронить сборку сообщения об ошибке — маловероятно, но описываемо. */
function describeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/**
 * §4.14: единственная точка HTTP-транспорта для всех парсеров сайтов компаний —
 * троттл (один на все хосты, CompanySiteRequestThrottle), ретраи 429/5xx (§4.6,
 * fetchWithRetries), маппинг статуса на сообщение. Ни один парсер не обращается к
 * HttpService напрямую — так и SSRF-проверка (§4.14: только парсеры знают, какие
 * хосты им можно), и повтор транспортной логики остаются в одном месте.
 *
 * Никогда не бросает наружу — любой сбой (сетевой, статус, не-HTML/не-JSON тело)
 * уходит результатом { ok: false, message }.
 */
@Injectable()
export class CompanySiteHttpClient {
  private readonly logger = new Logger(CompanySiteHttpClient.name);
  private readonly maxRetries: number;

  constructor(
    private readonly http: HttpService,
    configService: ConfigService,
    private readonly throttle: CompanySiteRequestThrottle,
  ) {
    this.maxRetries = configService.getOrThrow<number>(COMPANY_SITE_MAX_RETRIES_ENV_KEY);
  }

  /** §4.11.2: тот же слот троттла, которым описание страницы уже пользуется — единый лимит на все хосты. */
  readonly acquireRequestSlot = (): Promise<void> => this.throttle.acquire();

  getHtml(url: string): Promise<CompanySiteHtmlResult> {
    return fetchWithRetries<CompanySiteHtmlResult>(
      {
        maxRetries: this.maxRetries,
        onRetry: (pauseMs, attempt, result) => {
          this.logger.warn(
            `Повтор запроса ${describeHost(url)} через ${pauseMs} мс` +
              ` (попытка ${attempt + 1} из ${this.maxRetries}), успех: ${result.ok}`,
          );
        },
      },
      () =>
        this.request<{ html: string }>(url, VACANCY_ACCEPT_HEADER_VALUE, (payload) =>
          typeof payload === 'string'
            ? { ok: true, html: payload }
            : { ok: false, message: `${COMPANY_SITE_NOT_HTML_MESSAGE} (${describeHost(url)})` },
        ),
    );
  }

  /**
   * §4.14/Stage 3: JSON-эндпоинты сайтов компаний (aviasales/rzd/wildberries/
   * magnit-tech/dodo) — та же троттл/ретрай точка, что и getHtml, отличается только
   * Accept-заголовком и тем, что считается успешным телом (parseJsonBody, тот же
   * приём, что coercePayload у geekjob: responseType: 'text' модуля может принести
   * как сырую строку, так и уже распарсенный axios'ом объект).
   */
  getJson(url: string): Promise<CompanySiteJsonResult> {
    return fetchWithRetries<CompanySiteJsonResult>(
      {
        maxRetries: this.maxRetries,
        onRetry: (pauseMs, attempt, result) => {
          this.logger.warn(
            `Повтор запроса ${describeHost(url)} через ${pauseMs} мс` +
              ` (попытка ${attempt + 1} из ${this.maxRetries}), успех: ${result.ok}`,
          );
        },
      },
      () =>
        this.request<{ json: unknown }>(url, COMPANY_SITE_JSON_ACCEPT_HEADER_VALUE, (payload) => {
          const json = parseJsonBody(payload);

          return json === null
            ? { ok: false, message: `${COMPANY_SITE_NOT_JSON_MESSAGE} (${describeHost(url)})` }
            : { ok: true, json };
        }),
    );
  }

  /**
   * §4.14/Stage 3: общая точка транспорта, которую getHtml/getJson параметризуют
   * своим parseOk — статус-коды (404/429/5xx) маппятся одинаково для обоих, только
   * разбор успешного 200-тела различается (строка HTML против JSON-значения).
   */
  private async request<TSuccess>(
    url: string,
    accept: string,
    parseOk: (payload: unknown) => CompanySiteFetchResult<TSuccess>,
  ): Promise<VacancyRequestAttempt<CompanySiteFetchResult<TSuccess>>> {
    // §4.11.2: слот резервируется на КАЖДОЙ попытке ретрая, а не только на первой.
    await this.throttle.acquire();

    try {
      const response = await firstValueFrom(
        this.http.get<unknown>(url, {
          headers: { [ACCEPT_HEADER]: accept },
        }),
      );

      return this.interpretStatus(response.status, response.data, url, parseOk);
    } catch (error) {
      const message = describeTransportError(
        `${COMPANY_SITE_TRANSPORT_ERROR_MESSAGE} (${describeHost(url)})`,
        error,
      );

      this.logger.warn(message);

      return { result: { ok: false, message }, retryable: false };
    }
  }

  private interpretStatus<TSuccess>(
    status: number,
    payload: unknown,
    url: string,
    parseOk: (payload: unknown) => CompanySiteFetchResult<TSuccess>,
  ): VacancyRequestAttempt<CompanySiteFetchResult<TSuccess>> {
    const host = describeHost(url);

    if (status === OK_STATUS) {
      return { result: parseOk(payload), retryable: false };
    }

    if (status === NOT_FOUND_STATUS) {
      return {
        result: { ok: false, message: `${COMPANY_SITE_NOT_FOUND_MESSAGE} (${host})` },
        retryable: false,
      };
    }

    if (status === RATE_LIMITED_STATUS) {
      return {
        result: { ok: false, message: `${COMPANY_SITE_RATE_LIMITED_MESSAGE} (${host})` },
        retryable: true,
      };
    }

    const message = `${COMPANY_SITE_UNEXPECTED_STATUS_MESSAGE} ${status} (${host})`;

    // Ретраим только 5xx: прочие 4xx повтором не лечатся (§4.6).
    return { result: { ok: false, message }, retryable: status >= SERVER_ERROR_MIN_STATUS };
  }
}
