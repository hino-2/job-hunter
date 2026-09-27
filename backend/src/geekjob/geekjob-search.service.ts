import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

import { VACANCY_SOURCE } from '../applications/applications.constants';
import type { VacancySource } from '../applications/applications.type';
import {
  FORBIDDEN_STATUS,
  OK_STATUS,
  RATE_LIMITED_STATUS,
  SERVER_ERROR_MIN_STATUS,
} from '../common/common.constants';
import type {
  VacancyLeadSearchProvider,
  VacancyRequestAttempt,
  VacancySearchItem,
  VacancySearchPageRequest,
} from '../vacancies/vacancies.interfaces';
import type {
  VacancyDescriptionResult,
  VacancySearchPageResult,
} from '../vacancies/vacancies.type';
import { describeTransportError, fetchWithRetries } from '../vacancies/vacancy-retry.helpers';
import {
  GEEKJOB_FORBIDDEN_MESSAGE,
  GEEKJOB_LOGO_ALLOWED_HOST_PATTERN,
  GEEKJOB_MAX_RETRIES_ENV_KEY,
  GEEKJOB_RATE_LIMITED_MESSAGE,
  GEEKJOB_SEARCH_DESCRIPTION_MISSING_MESSAGE,
  GEEKJOB_SEARCH_PAGE_UNPARSABLE_MESSAGE,
  GEEKJOB_SITE_BASE_URL_ENV_KEY,
  GEEKJOB_TRANSPORT_ERROR_MESSAGE,
  GEEKJOB_UNEXPECTED_STATUS_MESSAGE,
  GEEKJOB_VACANCY_PAGE_PATH,
} from './geekjob.constants';
import { parseGeekjobDescription } from './geekjob-description.parser';
import { GeekjobRequestThrottle } from './geekjob-request.throttle';
import { buildGeekjobSearchUrl } from './geekjob-search-url.helpers';
import { countGeekjobSearchSignals, parseGeekjobSearchPage } from './geekjob-search.parser';

/**
 * §4.11.2–4.11.3, §4.11.7, §4.13: обращения к geekjob.ru конвейера поиска лидов —
 * JSON-страница выдачи и HTML-страница вакансии (ради описания и логотипа, не
 * архивности — это GeekjobApiService при синхронизации). Тот же троттл, тот же
 * HttpService модуля geekjob/, та же схема ретраев (§4.6, через общий
 * fetchWithRetries): 429 и 5xx. Исключений наружу не выпускает — результат
 * дискриминирован по `ok`, а не по SyncOutcome (§4.5). Зеркало it-vacancies-search.service.ts.
 */
@Injectable()
export class GeekjobSearchService implements VacancyLeadSearchProvider {
  readonly source: VacancySource = VACANCY_SOURCE.GEEKJOB;

  /** §4.11.4/§4.14: geekjob.ru отдаёт дату публикации выдачи как есть. */
  readonly publicationDateKnown = true;

  private readonly logger = new Logger(GeekjobSearchService.name);
  private readonly maxRetries: number;
  private readonly siteBaseUrl: string;

  constructor(
    private readonly http: HttpService,
    configService: ConfigService,
    private readonly throttle: GeekjobRequestThrottle,
  ) {
    this.maxRetries = configService.getOrThrow<number>(GEEKJOB_MAX_RETRIES_ENV_KEY);
    // §4.11.3: тот же базовый хост, что и у страницы вакансии — vacancyUrl каждого
    // элемента выдачи собирается каноническим.
    this.siteBaseUrl = configService.getOrThrow<string>(GEEKJOB_SITE_BASE_URL_ENV_KEY);
  }

  /**
   * §4.11.2, §4.10: скачивание логотипа компании лида идёт через тот же троттл, что
   * и запрос страницы — иначе прогон обходил бы общий лимит частоты к источнику.
   */
  readonly acquireRequestSlot = (): Promise<void> => this.throttle.acquire();

  fetchSearchPage(request: VacancySearchPageRequest): Promise<VacancySearchPageResult> {
    const { searchUrlTemplate, page } = request;
    const url = buildGeekjobSearchUrl(searchUrlTemplate, page);

    return fetchWithRetries<VacancySearchPageResult>(
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

  fetchVacancyDescription(item: VacancySearchItem): Promise<VacancyDescriptionResult> {
    const { externalId } = item;
    const path = `${GEEKJOB_VACANCY_PAGE_PATH}/${encodeURIComponent(externalId)}`;

    return fetchWithRetries<VacancyDescriptionResult>(
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
  ): Promise<VacancyRequestAttempt<VacancySearchPageResult>> {
    // §4.11.2: слот резервируется на КАЖДОЙ попытке ретрая, а не только на первой.
    await this.throttle.acquire();

    try {
      // URL уже абсолютный (buildGeekjobSearchUrl подставил свой хост из шаблона
      // настроек) — axios примет его поверх baseURL модуля, ровно как у hh.ru.
      const response = await firstValueFrom(this.http.get<unknown>(url));

      return this.interpretSearchResponse(response.status, response.data, page);
    } catch (error) {
      const message = describeTransportError(GEEKJOB_TRANSPORT_ERROR_MESSAGE, error);

      this.logger.warn(`Страница выдачи (page=${page}): ${message}`);

      return { result: { ok: false, message }, retryable: false };
    }
  }

  private interpretSearchResponse(
    status: number,
    payload: unknown,
    page: number,
  ): VacancyRequestAttempt<VacancySearchPageResult> {
    if (status === OK_STATUS) {
      const parsed = parseGeekjobSearchPage(payload, this.siteBaseUrl);

      if (parsed === null) {
        return {
          result: { ok: false, message: this.describeParseFailure(payload, page) },
          retryable: false,
        };
      }

      return { result: { ok: true, page: parsed }, retryable: false };
    }

    if (status === FORBIDDEN_STATUS) {
      return { result: { ok: false, message: GEEKJOB_FORBIDDEN_MESSAGE }, retryable: false };
    }

    if (status === RATE_LIMITED_STATUS) {
      return { result: { ok: false, message: GEEKJOB_RATE_LIMITED_MESSAGE }, retryable: true };
    }

    const message = `${GEEKJOB_UNEXPECTED_STATUS_MESSAGE} ${status}`;

    // Ретраим только 5xx: прочие 4xx повтором не лечатся (§4.6).
    return { result: { ok: false, message }, retryable: status >= SERVER_ERROR_MIN_STATUS };
  }

  /**
   * §4.13: разбор структурно поломан (data не массив) либо ответ вовсе не JSON —
   * в лог попадают счётчики документов/архивных и номер страницы. Тело ответа не
   * логируется — только его длина.
   */
  private describeParseFailure(payload: unknown, page: number): string {
    const { documents, archived } = countGeekjobSearchSignals(payload);
    const length = typeof payload === 'string' ? payload.length : 0;

    this.logger.warn(
      `${GEEKJOB_SEARCH_PAGE_UNPARSABLE_MESSAGE}` +
        ` (page=${page}, документов: ${documents}, архивных: ${archived}, длина ответа: ${length})`,
    );

    return GEEKJOB_SEARCH_PAGE_UNPARSABLE_MESSAGE;
  }

  private async requestVacancyDescription(
    path: string,
    externalId: string,
  ): Promise<VacancyRequestAttempt<VacancyDescriptionResult>> {
    await this.throttle.acquire();

    try {
      const response = await firstValueFrom(this.http.get<unknown>(path));

      return this.interpretDescriptionResponse(response.status, response.data, externalId);
    } catch (error) {
      const message = describeTransportError(GEEKJOB_TRANSPORT_ERROR_MESSAGE, error);

      this.logger.warn(`Описание вакансии ${externalId}: ${message}`);

      return { result: { ok: false, message }, retryable: false };
    }
  }

  private interpretDescriptionResponse(
    status: number,
    payload: unknown,
    externalId: string,
  ): VacancyRequestAttempt<VacancyDescriptionResult> {
    if (status === OK_STATUS) {
      const parsed = parseGeekjobDescription(payload, this.siteBaseUrl);

      if (parsed === null) {
        // §4.11.7: fail-closed — вакансия не проходит этап отбора, а не тихо
        // теряет описание.
        this.logger.warn(`${GEEKJOB_SEARCH_DESCRIPTION_MISSING_MESSAGE} (вакансия ${externalId})`);

        return {
          result: { ok: false, message: GEEKJOB_SEARCH_DESCRIPTION_MISSING_MESSAGE },
          retryable: false,
        };
      }

      // §4.10: та же страница уже загружена ради описания — логотип компании лида
      // разбирается из неё же, без отдельного HTTP-запроса.
      return {
        result: {
          ok: true,
          description: parsed.description,
          logoUrl: parsed.logoUrl,
          logoAllowedHostPattern: parsed.logoUrl === null ? null : GEEKJOB_LOGO_ALLOWED_HOST_PATTERN,
        },
        retryable: false,
      };
    }

    if (status === FORBIDDEN_STATUS) {
      return { result: { ok: false, message: GEEKJOB_FORBIDDEN_MESSAGE }, retryable: false };
    }

    if (status === RATE_LIMITED_STATUS) {
      return { result: { ok: false, message: GEEKJOB_RATE_LIMITED_MESSAGE }, retryable: true };
    }

    const message = `${GEEKJOB_UNEXPECTED_STATUS_MESSAGE} ${status}`;

    return { result: { ok: false, message }, retryable: status >= SERVER_ERROR_MIN_STATUS };
  }
}
