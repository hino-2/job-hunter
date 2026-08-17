import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

import {
  FORBIDDEN_STATUS,
  NOT_FOUND_STATUS,
  OK_STATUS,
  RATE_LIMITED_STATUS,
  SERVER_ERROR_MIN_STATUS,
} from '../common/common.constants';
import { htmlToPlainText } from '../common/html.helpers';
import type { VacancyRequestAttempt } from '../vacancies/vacancies.interfaces';
import { resolveVacancyLogoUrl } from '../vacancies/vacancy-logo-url.helpers';
import { describeTransportError, fetchWithRetries } from '../vacancies/vacancy-retry.helpers';
import { readHhCompanyLogoSrc } from './hh-company-logo.helpers';
import {
  HH_FORBIDDEN_MESSAGE,
  HH_LOGO_ALLOWED_HOST_PATTERN,
  HH_MAX_RETRIES_ENV_KEY,
  HH_NOT_FOUND_MESSAGE,
  HH_RATE_LIMITED_MESSAGE,
  HH_SEARCH_DESCRIPTION_MISSING_MESSAGE,
  HH_SEARCH_PAGE_UNPARSABLE_MESSAGE,
  HH_SITE_BASE_URL_ENV_KEY,
  HH_TRANSPORT_ERROR_MESSAGE,
  HH_UNEXPECTED_STATUS_MESSAGE,
  HH_VACANCY_PAGE_PATH,
} from './hh.constants';
import { parseHhVacancyDescription } from './hh-description.parser';
import { HhRequestThrottle } from './hh-request.throttle';
import { buildHhSearchUrl } from './hh-search-url.helpers';
import { parseHhSearchPage } from './hh-search.parser';
import type { HhSearchPageRequest } from './hh.interfaces';
import type { HhDescriptionResult, HhSearchPageResult } from './hh.type';

/**
 * §4.11.2–4.11.3, §4.11.7: обращения к hh.ru конвейера поиска — страница выдачи
 * и страница вакансии (только ради описания, не архивности/логотипа — это делает
 * HhApiService при синхронизации). Тот же троттл, тот же HttpService модуля hh/
 * (baseURL/таймаут/User-Agent/потолок размера ответа из buildHhHttpOptions),
 * та же схема ретраев (§4.6, через общий fetchWithRetries): 429 и 5xx, backoff
 * 500/1500 мс. Исключений наружу не выпускает — результат дискриминирован по `ok`,
 * а не по SyncOutcome (§4.5): сбой поиска не пишется в applications.last_sync_outcome.
 */
@Injectable()
export class HhSearchService {
  private readonly logger = new Logger(HhSearchService.name);
  private readonly maxRetries: number;
  private readonly siteBaseUrl: string;

  constructor(
    private readonly http: HttpService,
    configService: ConfigService,
    private readonly throttle: HhRequestThrottle,
  ) {
    this.maxRetries = configService.getOrThrow<number>(HH_MAX_RETRIES_ENV_KEY);
    // §4.11.3: тот же базовый хост, что и у страницы вакансии — vacancyUrl каждого
    // элемента выдачи собирается каноническим, а не из links.desktop (региональный хост).
    this.siteBaseUrl = configService.getOrThrow<string>(HH_SITE_BASE_URL_ENV_KEY);
  }

  /**
   * §4.11.2, §4.10 (шаг №26 §14): скачивание логотипа компании лида идёт через тот же
   * троттл, что и запрос страницы вакансии — иначе прогон поиска обходил бы общий лимит
   * частоты к hh.ru. Стрелка, а не обычный метод — тот же приём, что у HhApiService:
   * CompanyLogoDownloadRequest.acquireSlot ждёт функцию без привязанного this.
   */
  readonly acquireRequestSlot = (): Promise<void> => this.throttle.acquire();

  fetchSearchPage(request: HhSearchPageRequest): Promise<HhSearchPageResult> {
    const { searchUrlTemplate, page } = request;
    const url = buildHhSearchUrl(searchUrlTemplate, page);

    return fetchWithRetries<HhSearchPageResult>(
      {
        maxRetries: this.maxRetries,
        onRetry: (pauseMs, attempt, result) => {
          this.logger.warn(
            `Повтор запроса страницы выдачи (page=${page}) через ${pauseMs} мс` +
              ` (попытка ${attempt + 1} из ${this.maxRetries}), успех: ${result.ok}`,
          );
        },
      },
      () => this.requestSearchPage(url, page),
    );
  }

  fetchVacancyDescription(externalId: string): Promise<HhDescriptionResult> {
    const path = `${HH_VACANCY_PAGE_PATH}/${encodeURIComponent(externalId)}`;

    return fetchWithRetries<HhDescriptionResult>(
      {
        maxRetries: this.maxRetries,
        onRetry: (pauseMs, attempt, result) => {
          this.logger.warn(
            `Повтор запроса описания вакансии ${externalId} через ${pauseMs} мс` +
              ` (попытка ${attempt + 1} из ${this.maxRetries}), успех: ${result.ok}`,
          );
        },
      },
      () => this.requestVacancyDescription(path, externalId),
    );
  }

  private async requestSearchPage(
    url: string,
    page: number,
  ): Promise<VacancyRequestAttempt<HhSearchPageResult>> {
    // §4.11.2: слот резервируется на КАЖДОЙ попытке ретрая, а не только на первой.
    await this.throttle.acquire();

    try {
      const response = await firstValueFrom(this.http.get<unknown>(url));

      return this.interpretSearchResponse(response.status, response.data, page);
    } catch (error) {
      const message = describeTransportError(HH_TRANSPORT_ERROR_MESSAGE, error);

      this.logger.warn(`Страница выдачи (page=${page}): ${message}`);

      return { result: { ok: false, message }, retryable: false };
    }
  }

  private interpretSearchResponse(
    status: number,
    payload: unknown,
    page: number,
  ): VacancyRequestAttempt<HhSearchPageResult> {
    if (status === OK_STATUS) {
      const parsed = parseHhSearchPage(payload, this.siteBaseUrl);

      if (parsed === null) {
        // Тело не логируем — только длину, чтобы не заносить в лог всю страницу выдачи.
        const length = typeof payload === 'string' ? payload.length : 0;

        this.logger.warn(
          `${HH_SEARCH_PAGE_UNPARSABLE_MESSAGE} (page=${page}, длина ответа: ${length})`,
        );

        return {
          result: { ok: false, message: HH_SEARCH_PAGE_UNPARSABLE_MESSAGE },
          retryable: false,
        };
      }

      return { result: { ok: true, page: parsed }, retryable: false };
    }

    if (status === FORBIDDEN_STATUS) {
      return { result: { ok: false, message: HH_FORBIDDEN_MESSAGE }, retryable: false };
    }

    if (status === RATE_LIMITED_STATUS) {
      return { result: { ok: false, message: HH_RATE_LIMITED_MESSAGE }, retryable: true };
    }

    const message = `${HH_UNEXPECTED_STATUS_MESSAGE} ${status}`;

    // Ретраим только 5xx: прочие 4xx повтором не лечатся (§4.6).
    return { result: { ok: false, message }, retryable: status >= SERVER_ERROR_MIN_STATUS };
  }

  private async requestVacancyDescription(
    path: string,
    externalId: string,
  ): Promise<VacancyRequestAttempt<HhDescriptionResult>> {
    await this.throttle.acquire();

    try {
      const response = await firstValueFrom(this.http.get<unknown>(path));

      return this.interpretDescriptionResponse(response.status, response.data, externalId);
    } catch (error) {
      const message = describeTransportError(HH_TRANSPORT_ERROR_MESSAGE, error);

      this.logger.warn(`Описание вакансии ${externalId}: ${message}`);

      return { result: { ok: false, message }, retryable: false };
    }
  }

  private interpretDescriptionResponse(
    status: number,
    payload: unknown,
    externalId: string,
  ): VacancyRequestAttempt<HhDescriptionResult> {
    if (status === OK_STATUS) {
      const rawDescription = parseHhVacancyDescription(payload);

      if (rawDescription === null) {
        // §4.11.7: fail-closed — вакансия не проходит этап 4, а не тихо теряет описание.
        this.logger.warn(`${HH_SEARCH_DESCRIPTION_MISSING_MESSAGE} (вакансия ${externalId})`);

        return {
          result: { ok: false, message: HH_SEARCH_DESCRIPTION_MISSING_MESSAGE },
          retryable: false,
        };
      }

      // §4.10 (шаг №26 §14): та же страница вакансии уже загружена ради описания —
      // логотип компании лида разбирается из неё же, без отдельного HTTP-запроса.
      const logoSrc = typeof payload === 'string' ? readHhCompanyLogoSrc(payload) : null;
      const logoUrl = resolveVacancyLogoUrl(
        logoSrc,
        this.siteBaseUrl,
        HH_LOGO_ALLOWED_HOST_PATTERN,
      );
      const logoAllowedHostPattern = logoUrl === null ? null : HH_LOGO_ALLOWED_HOST_PATTERN;

      return {
        result: {
          ok: true,
          description: htmlToPlainText(rawDescription),
          logoUrl,
          logoAllowedHostPattern,
        },
        retryable: false,
      };
    }

    if (status === NOT_FOUND_STATUS) {
      return { result: { ok: false, message: HH_NOT_FOUND_MESSAGE }, retryable: false };
    }

    if (status === FORBIDDEN_STATUS) {
      return { result: { ok: false, message: HH_FORBIDDEN_MESSAGE }, retryable: false };
    }

    if (status === RATE_LIMITED_STATUS) {
      return { result: { ok: false, message: HH_RATE_LIMITED_MESSAGE }, retryable: true };
    }

    const message = `${HH_UNEXPECTED_STATUS_MESSAGE} ${status}`;

    return { result: { ok: false, message }, retryable: status >= SERVER_ERROR_MIN_STATUS };
  }
}
