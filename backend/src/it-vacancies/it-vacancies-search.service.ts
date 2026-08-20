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
  VacancySearchPageRequest,
} from '../vacancies/vacancies.interfaces';
import type {
  VacancyDescriptionResult,
  VacancySearchPageResult,
} from '../vacancies/vacancies.type';
import { describeTransportError, fetchWithRetries } from '../vacancies/vacancy-retry.helpers';
import {
  IT_VACANCIES_FORBIDDEN_MESSAGE,
  IT_VACANCIES_LOGO_ALLOWED_HOST_PATTERN,
  IT_VACANCIES_MAX_RETRIES_ENV_KEY,
  IT_VACANCIES_RATE_LIMITED_MESSAGE,
  IT_VACANCIES_SEARCH_CARD_COUNT_MISMATCH_MESSAGE,
  IT_VACANCIES_SEARCH_DESCRIPTION_MISSING_MESSAGE,
  IT_VACANCIES_SEARCH_PAGE_UNPARSABLE_MESSAGE,
  IT_VACANCIES_SITE_BASE_URL_ENV_KEY,
  IT_VACANCIES_TRANSPORT_ERROR_MESSAGE,
  IT_VACANCIES_UNEXPECTED_STATUS_MESSAGE,
  IT_VACANCIES_VACANCY_PAGE_PATH,
} from './it-vacancies.constants';
import { ItVacanciesRequestThrottle } from './it-vacancies-request.throttle';
import { parseItVacanciesDescription } from './it-vacancies-description.parser';
import { buildItVacanciesSearchUrl } from './it-vacancies-search-url.helpers';
import {
  countItVacanciesSearchSignals,
  parseItVacanciesSearchPage,
} from './it-vacancies-search.parser';

/**
 * §4.11.2–4.11.3, §4.11.7: обращения к it-vacancies.ru конвейера поиска лидов —
 * страница выдачи и страница вакансии (ради описания и логотипа, не архивности —
 * это делает ItVacanciesApiService при синхронизации). Тот же троттл, тот же
 * HttpService модуля it-vacancies/, та же схема ретраев (§4.6, через общий
 * fetchWithRetries): 429 и 5xx. Исключений наружу не выпускает — результат
 * дискриминирован по `ok`, а не по SyncOutcome (§4.5). Зеркало hh-search.service.ts.
 */
@Injectable()
export class ItVacanciesSearchService implements VacancyLeadSearchProvider {
  readonly source: VacancySource = VACANCY_SOURCE.IT_VACANCIES;

  private readonly logger = new Logger(ItVacanciesSearchService.name);
  private readonly maxRetries: number;
  private readonly siteBaseUrl: string;

  constructor(
    private readonly http: HttpService,
    configService: ConfigService,
    private readonly throttle: ItVacanciesRequestThrottle,
  ) {
    this.maxRetries = configService.getOrThrow<number>(IT_VACANCIES_MAX_RETRIES_ENV_KEY);
    // §4.11.3: тот же базовый хост, что и у страницы вакансии — vacancyUrl каждого
    // элемента выдачи собирается каноническим, а не из href карточки с ?query=… .
    this.siteBaseUrl = configService.getOrThrow<string>(IT_VACANCIES_SITE_BASE_URL_ENV_KEY);
  }

  /**
   * §4.11.2, §4.10: скачивание логотипа компании лида идёт через тот же троттл, что
   * и запрос страницы — иначе прогон обходил бы общий лимит частоты к источнику.
   */
  readonly acquireRequestSlot = (): Promise<void> => this.throttle.acquire();

  fetchSearchPage(request: VacancySearchPageRequest): Promise<VacancySearchPageResult> {
    const { searchUrlTemplate, page } = request;
    const url = buildItVacanciesSearchUrl(searchUrlTemplate, page);

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

  fetchVacancyDescription(externalId: string): Promise<VacancyDescriptionResult> {
    const path = `${IT_VACANCIES_VACANCY_PAGE_PATH}/${encodeURIComponent(externalId)}/`;

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
      const response = await firstValueFrom(this.http.get<unknown>(url));

      return this.interpretSearchResponse(response.status, response.data, page);
    } catch (error) {
      const message = describeTransportError(IT_VACANCIES_TRANSPORT_ERROR_MESSAGE, error);

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
      const parsed = parseItVacanciesSearchPage(payload, this.siteBaseUrl);

      if (parsed === null) {
        return {
          result: { ok: false, message: this.describeParseFailure(payload, page) },
          retryable: false,
        };
      }

      return { result: { ok: true, page: parsed }, retryable: false };
    }

    if (status === FORBIDDEN_STATUS) {
      return { result: { ok: false, message: IT_VACANCIES_FORBIDDEN_MESSAGE }, retryable: false };
    }

    if (status === RATE_LIMITED_STATUS) {
      return { result: { ok: false, message: IT_VACANCIES_RATE_LIMITED_MESSAGE }, retryable: true };
    }

    const message = `${IT_VACANCIES_UNEXPECTED_STATUS_MESSAGE} ${status}`;

    // Ретраим только 5xx: прочие 4xx повтором не лечатся (§4.6).
    return { result: { ok: false, message }, retryable: status >= SERVER_ERROR_MIN_STATUS };
  }

  /**
   * §4.11.3: расхождение числа JobPosting и числа ссылок карточек — самая вероятная
   * поломка при правке разметки источника, поэтому в лог попадают ОБА числа и номер
   * страницы. Тело ответа не логируется — только его длина.
   */
  private describeParseFailure(payload: unknown, page: number): string {
    const { postings, cards } = countItVacanciesSearchSignals(payload);
    const length = typeof payload === 'string' ? payload.length : 0;

    if (postings !== cards) {
      this.logger.warn(
        `${IT_VACANCIES_SEARCH_CARD_COUNT_MISMATCH_MESSAGE}` +
          ` (page=${page}, JobPosting: ${postings}, ссылок карточек: ${cards})`,
      );

      return IT_VACANCIES_SEARCH_CARD_COUNT_MISMATCH_MESSAGE;
    }

    this.logger.warn(
      `${IT_VACANCIES_SEARCH_PAGE_UNPARSABLE_MESSAGE} (page=${page}, длина ответа: ${length})`,
    );

    return IT_VACANCIES_SEARCH_PAGE_UNPARSABLE_MESSAGE;
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
      const message = describeTransportError(IT_VACANCIES_TRANSPORT_ERROR_MESSAGE, error);

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
      const parsed = parseItVacanciesDescription(payload, this.siteBaseUrl);

      if (parsed === null) {
        // §4.11.7: fail-closed — вакансия не проходит этап отбора, а не тихо
        // теряет описание.
        this.logger.warn(
          `${IT_VACANCIES_SEARCH_DESCRIPTION_MISSING_MESSAGE} (вакансия ${externalId})`,
        );

        return {
          result: { ok: false, message: IT_VACANCIES_SEARCH_DESCRIPTION_MISSING_MESSAGE },
          retryable: false,
        };
      }

      // §4.10: та же страница уже загружена ради описания — логотип компании лида
      // разбирается из неё же, без отдельного HTTP-запроса. Пара logoUrl/allow-list
      // заполняется вместе: CompanyLogoService повторит проверку на каждом хопе
      // редиректа.
      return {
        result: {
          ok: true,
          description: parsed.description,
          logoUrl: parsed.logoUrl,
          logoAllowedHostPattern:
            parsed.logoUrl === null ? null : IT_VACANCIES_LOGO_ALLOWED_HOST_PATTERN,
        },
        retryable: false,
      };
    }

    if (status === FORBIDDEN_STATUS) {
      return { result: { ok: false, message: IT_VACANCIES_FORBIDDEN_MESSAGE }, retryable: false };
    }

    if (status === RATE_LIMITED_STATUS) {
      return { result: { ok: false, message: IT_VACANCIES_RATE_LIMITED_MESSAGE }, retryable: true };
    }

    const message = `${IT_VACANCIES_UNEXPECTED_STATUS_MESSAGE} ${status}`;

    return { result: { ok: false, message }, retryable: status >= SERVER_ERROR_MIN_STATUS };
  }
}
