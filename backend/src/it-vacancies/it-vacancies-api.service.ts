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
import type {
  VacancyRequestAttempt,
  VacancySourceProvider,
} from '../vacancies/vacancies.interfaces';
import type { VacancyFetchResult } from '../vacancies/vacancies.type';
import { describeTransportError, fetchWithRetries } from '../vacancies/vacancy-retry.helpers';
import {
  IT_VACANCIES_FORBIDDEN_MESSAGE,
  IT_VACANCIES_MAX_RETRIES_ENV_KEY,
  IT_VACANCIES_NOT_FOUND_MESSAGE,
  IT_VACANCIES_PAGE_UNPARSABLE_MESSAGE,
  IT_VACANCIES_RATE_LIMITED_MESSAGE,
  IT_VACANCIES_SITE_BASE_URL_ENV_KEY,
  IT_VACANCIES_TRANSPORT_ERROR_MESSAGE,
  IT_VACANCIES_UNEXPECTED_STATUS_MESSAGE,
  IT_VACANCIES_VACANCY_PAGE_PATH,
} from './it-vacancies.constants';
import { ItVacanciesRequestThrottle } from './it-vacancies-request.throttle';
import { parseItVacanciesVacancyPage } from './it-vacancies-page.parser';
import { parseItVacanciesVacancyId } from './it-vacancies-url.parser';

/**
 * Единственная точка обращения к it-vacancies.ru при синхронизации (§4.3, §4.8):
 * загрузка HTML-страницы вакансии, троттл (§4.11.2), ретраи (§4.6, через общий
 * fetchWithRetries) и разбор ответа через parseItVacanciesVacancyPage. Исключения
 * наружу не выпускает — любой сбой превращается в исход из §4.5. Зеркало
 * hh-api.service.ts/getmatch-api.service.ts.
 *
 * implements VacancySourceProvider: отдельного класса-обёртки нет — сам сервис
 * и есть провайдер источника it-vacancies.
 */
@Injectable()
export class ItVacanciesApiService implements VacancySourceProvider {
  readonly source: VacancySource = VACANCY_SOURCE.IT_VACANCIES;

  private readonly logger = new Logger(ItVacanciesApiService.name);
  private readonly maxRetries: number;
  private readonly siteBaseUrl: string;

  constructor(
    private readonly http: HttpService,
    configService: ConfigService,
    private readonly throttle: ItVacanciesRequestThrottle,
  ) {
    this.maxRetries = configService.getOrThrow<number>(IT_VACANCIES_MAX_RETRIES_ENV_KEY);
    // §4.10: та же переменная, что задаёт baseURL HTTP-клиента — логотип
    // абсолютизируется относительно того же базового хоста.
    this.siteBaseUrl = configService.getOrThrow<string>(IT_VACANCIES_SITE_BASE_URL_ENV_KEY);
  }

  /**
   * §4.11.2, §4.10: скачивание логотипа компании идёт через тот же троттл, что и
   * запрос страницы вакансии. Стрелка, а не обычный метод — тот же приём, что у
   * HhApiService: CompanyLogoDownloadRequest.acquireSlot ждёт функцию без
   * привязанного this.
   */
  readonly acquireRequestSlot = (): Promise<void> => this.throttle.acquire();

  parseUrl(rawUrl: string | null | undefined): string | null {
    return parseItVacanciesVacancyId(rawUrl);
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

  private async requestVacancy(
    vacancyId: string,
  ): Promise<VacancyRequestAttempt<VacancyFetchResult>> {
    // §4.11.2: троттл на КАЖДОЙ попытке ретрая, а не только на первой — fetchWithRetries
    // зовёт requestVacancy заново на каждый повтор.
    await this.throttle.acquire();

    // Замыкающий слеш обязателен: без него источник отвечает редиректом на
    // канонический адрес, то есть тратит лишний запрос из бюджета троттла.
    const path = `${IT_VACANCIES_VACANCY_PAGE_PATH}/${encodeURIComponent(vacancyId)}/`;

    try {
      const response = await firstValueFrom(this.http.get<unknown>(path));

      return this.interpretResponse(response.status, response.data);
    } catch (error) {
      // Сюда попадает только транспорт: таймаут, DNS, отказ в соединении —
      // HTTP-статусы через validateStatus исключением не становятся.
      const message = describeTransportError(IT_VACANCIES_TRANSPORT_ERROR_MESSAGE, error);

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
        result: { outcome: SYNC_OUTCOME.NOT_FOUND, message: IT_VACANCIES_NOT_FOUND_MESSAGE },
        retryable: false,
      };
    }

    if (status === FORBIDDEN_STATUS) {
      // Блокировка по User-Agent или IP: повтором не лечится.
      return {
        result: { outcome: SYNC_OUTCOME.ERROR, message: IT_VACANCIES_FORBIDDEN_MESSAGE },
        retryable: false,
      };
    }

    if (status === RATE_LIMITED_STATUS) {
      return {
        result: { outcome: SYNC_OUTCOME.RATE_LIMITED, message: IT_VACANCIES_RATE_LIMITED_MESSAGE },
        retryable: true,
      };
    }

    const message = `${IT_VACANCIES_UNEXPECTED_STATUS_MESSAGE} ${status}`;

    // Ретраим только 5xx: прочие 4xx повтором не лечатся.
    return {
      result: { outcome: SYNC_OUTCOME.ERROR, message },
      retryable: status >= SERVER_ERROR_MIN_STATUS,
    };
  }

  private interpretPage(payload: unknown): VacancyRequestAttempt<VacancyFetchResult> {
    const vacancy = parseItVacanciesVacancyPage(payload, this.siteBaseUrl);

    if (vacancy !== null) {
      return { result: { outcome: SYNC_OUTCOME.OK, vacancy }, retryable: false };
    }

    // Тело не логируем — только длину, чтобы не заносить в лог всю страницу.
    const length = typeof payload === 'string' ? payload.length : 0;

    this.logger.warn(`${IT_VACANCIES_PAGE_UNPARSABLE_MESSAGE} (длина ответа: ${length})`);

    return {
      result: { outcome: SYNC_OUTCOME.ERROR, message: IT_VACANCIES_PAGE_UNPARSABLE_MESSAGE },
      retryable: false,
    };
  }
}
