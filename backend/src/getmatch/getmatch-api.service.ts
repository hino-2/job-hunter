import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

import { SYNC_OUTCOME, VACANCY_SOURCE } from '../applications/applications.constants';
import type { VacancySource } from '../applications/applications.type';
import {
  FORBIDDEN_STATUS,
  NOT_FOUND_STATUS,
  OK_STATUS,
  RATE_LIMITED_STATUS,
  SERVER_ERROR_MIN_STATUS,
} from '../common/common.constants';
import { describeTransportError, fetchWithRetries } from '../vacancies/vacancy-retry.helpers';
import type {
  VacancyRequestAttempt,
  VacancySourceProvider,
} from '../vacancies/vacancies.interfaces';
import type { VacancyFetchResult } from '../vacancies/vacancies.type';
import {
  GETMATCH_FORBIDDEN_MESSAGE,
  GETMATCH_MAX_RETRIES_ENV_KEY,
  GETMATCH_NOT_FOUND_MESSAGE,
  GETMATCH_PAGE_STATE,
  GETMATCH_PAGE_UNPARSABLE_MESSAGE,
  GETMATCH_RATE_LIMITED_MESSAGE,
  GETMATCH_SITE_BASE_URL_ENV_KEY,
  GETMATCH_TRANSPORT_ERROR_MESSAGE,
  GETMATCH_UNEXPECTED_STATUS_MESSAGE,
  GETMATCH_VACANCY_PAGE_PATH,
} from './getmatch.constants';
import { parseGetmatchVacancyPage } from './getmatch-page.parser';
import { parseGetmatchVacancyId } from './getmatch-url.parser';

/**
 * Единственная точка обращения к getmatch.ru (§4.9): загрузка HTML-страницы
 * вакансии, ретраи (§4.6, через общий fetchWithRetries) и разбор ответа через
 * parseGetmatchVacancyPage. Исключения наружу не выпускает — любой сбой
 * превращается в исход из §4.5. Зеркало hh-api.service.ts.
 *
 * Ключевое отличие от hh.ru: «вакансии нет» отдаётся HTTP 200 с
 * initialVacancy: null, а не статусом 404. Поэтому трёхзначный результат
 * parseGetmatchVacancyPage схлопывается в обычный VacancyFetchResult прямо
 * здесь, в ветке OK_STATUS, — общий контракт §4 не меняется ни строкой,
 * в нём NOT_FOUND остаётся исходом, а не HTTP-статусом (§3 блюпринта).
 *
 * implements VacancySourceProvider: отдельного класса-обёртки нет — сам сервис
 * и есть провайдер источника getmatch.
 */
@Injectable()
export class GetmatchApiService implements VacancySourceProvider {
  readonly source: VacancySource = VACANCY_SOURCE.GETMATCH;

  private readonly logger = new Logger(GetmatchApiService.name);
  private readonly maxRetries: number;
  private readonly siteBaseUrl: string;

  constructor(
    private readonly http: HttpService,
    configService: ConfigService,
  ) {
    this.maxRetries = configService.getOrThrow<number>(GETMATCH_MAX_RETRIES_ENV_KEY);
    // §4.10: та же переменная, что задаёт baseURL HTTP-клиента — логотип
    // абсолютизируется относительно того же базового хоста getmatch.ru.
    this.siteBaseUrl = configService.getOrThrow<string>(GETMATCH_SITE_BASE_URL_ENV_KEY);
  }

  parseUrl(rawUrl: string | null | undefined): string | null {
    return parseGetmatchVacancyId(rawUrl);
  }

  fetchVacancy(vacancyId: string): Promise<VacancyFetchResult> {
    return fetchWithRetries<VacancyFetchResult>(
      {
        maxRetries: this.maxRetries,
        onRetry: (pauseMs, attempt, result) => {
          this.logger.warn(
            `Повтор запроса вакансии ${vacancyId} через ${pauseMs} мс` +
              ` (попытка ${attempt + 1} из ${this.maxRetries}), исход: ${result.outcome}`,
          );
        },
      },
      () => this.requestVacancy(vacancyId),
    );
  }

  private async requestVacancy(vacancyId: string): Promise<VacancyRequestAttempt<VacancyFetchResult>> {
    const path = `${GETMATCH_VACANCY_PAGE_PATH}/${encodeURIComponent(vacancyId)}`;

    try {
      const response = await firstValueFrom(this.http.get<unknown>(path));

      return this.interpretResponse(response.status, response.data);
    } catch (error) {
      // Сюда попадает только транспорт: таймаут, DNS, отказ в соединении —
      // HTTP-статусы через validateStatus исключением не становятся.
      const message = describeTransportError(GETMATCH_TRANSPORT_ERROR_MESSAGE, error);

      this.logger.warn(`Вакансия ${vacancyId}: ${message}`);

      return { result: { outcome: SYNC_OUTCOME.ERROR, message }, retryable: false };
    }
  }

  private interpretResponse(
    status: number,
    payload: unknown,
  ): VacancyRequestAttempt<VacancyFetchResult> {
    if (status === OK_STATUS) {
      return this.interpretPage(payload);
    }

    if (status === NOT_FOUND_STATUS) {
      return {
        result: { outcome: SYNC_OUTCOME.NOT_FOUND, message: GETMATCH_NOT_FOUND_MESSAGE },
        retryable: false,
      };
    }

    if (status === FORBIDDEN_STATUS) {
      // Блокировка по User-Agent или IP: повтором не лечится.
      return {
        result: { outcome: SYNC_OUTCOME.ERROR, message: GETMATCH_FORBIDDEN_MESSAGE },
        retryable: false,
      };
    }

    if (status === RATE_LIMITED_STATUS) {
      return {
        result: { outcome: SYNC_OUTCOME.RATE_LIMITED, message: GETMATCH_RATE_LIMITED_MESSAGE },
        retryable: true,
      };
    }

    const message = `${GETMATCH_UNEXPECTED_STATUS_MESSAGE} ${status}`;

    // Ретраим только 5xx: прочие 4xx повтором не лечатся.
    return {
      result: { outcome: SYNC_OUTCOME.ERROR, message },
      retryable: status >= SERVER_ERROR_MIN_STATUS,
    };
  }

  /**
   * §4.9: три состояния разбора схлопываются в обычный исход прямо здесь. ABSENT —
   * это не ошибка: getmatch.ru отвечает 200 и на несуществующую вакансию, отличить
   * её от «страница не распознана» может только парсер payload.
   */
  private interpretPage(payload: unknown): VacancyRequestAttempt<VacancyFetchResult> {
    const parsed = parseGetmatchVacancyPage(payload, this.siteBaseUrl);

    if (parsed.state === GETMATCH_PAGE_STATE.PARSED) {
      return { result: { outcome: SYNC_OUTCOME.OK, vacancy: parsed.vacancy }, retryable: false };
    }

    if (parsed.state === GETMATCH_PAGE_STATE.ABSENT) {
      return {
        result: { outcome: SYNC_OUTCOME.NOT_FOUND, message: GETMATCH_NOT_FOUND_MESSAGE },
        retryable: false,
      };
    }

    // UNPARSABLE: тело не логируем — только длину, чтобы не заносить в лог всю страницу.
    const length = typeof payload === 'string' ? payload.length : 0;

    this.logger.warn(`${GETMATCH_PAGE_UNPARSABLE_MESSAGE} (длина ответа: ${length})`);

    return {
      result: { outcome: SYNC_OUTCOME.ERROR, message: GETMATCH_PAGE_UNPARSABLE_MESSAGE },
      retryable: false,
    };
  }
}
