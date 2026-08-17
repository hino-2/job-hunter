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
  HH_FORBIDDEN_MESSAGE,
  HH_JSON_LD_MISSING_MESSAGE,
  HH_MAX_RETRIES_ENV_KEY,
  HH_NOT_FOUND_MESSAGE,
  HH_PAGE_UNPARSABLE_MESSAGE,
  HH_RATE_LIMITED_MESSAGE,
  HH_SITE_BASE_URL_ENV_KEY,
  HH_TRANSPORT_ERROR_MESSAGE,
  HH_UNEXPECTED_STATUS_MESSAGE,
  HH_VACANCY_PAGE_PATH,
} from './hh.constants';
import { parseHhVacancyPage } from './hh-page.parser';
import { HhRequestThrottle } from './hh-request.throttle';
import { parseHhVacancyId } from './hh-url.parser';

/**
 * Единственная точка обращения к hh.ru (§4.1): загрузка HTML-страницы вакансии,
 * таймаут, ретраи (§4.6, через общий fetchWithRetries) и разбор ответа через
 * parseHhVacancyPage. Исключения наружу не выпускает — любой сбой превращается
 * в исход из §4.5, потому что вызывающему (preview в §5.3 и синхронизации в §5.2)
 * нужно различать «снята», «лимит», «ошибка», а не ловить разнородные ошибки axios.
 *
 * Анонимный JSON API hh.ru отвечает 403 (поддержка для роли «соискатель» прекращена),
 * поэтому единственный доступный источник — публичная HTML-страница вакансии.
 *
 * implements VacancySourceProvider: отдельного класса-обёртки нет — сам сервис
 * и есть провайдер источника hh (§3 блюпринта).
 */
@Injectable()
export class HhApiService implements VacancySourceProvider {
  readonly source: VacancySource = VACANCY_SOURCE.HH;

  private readonly logger = new Logger(HhApiService.name);
  private readonly maxRetries: number;
  private readonly siteBaseUrl: string;

  constructor(
    private readonly http: HttpService,
    configService: ConfigService,
    private readonly throttle: HhRequestThrottle,
  ) {
    this.maxRetries = configService.getOrThrow<number>(HH_MAX_RETRIES_ENV_KEY);
    // §4.10: та же переменная, что задаёт baseURL HTTP-клиента (HH_HTTP_ENV_KEYS.baseUrl) —
    // логотип абсолютизируется относительно того же базового хоста hh.ru.
    this.siteBaseUrl = configService.getOrThrow<string>(HH_SITE_BASE_URL_ENV_KEY);
  }

  /**
   * §4.11.2: тот же троттл, что и запросы страницы вакансии — скачивание логотипа
   * компании с hhcdn.ru тоже обязано идти через общий лимит частоты к hh.ru. Стрелка,
   * а не обычный метод: CompanyLogoDownloadRequest.acquireSlot ждёт функцию без
   * привязанного this, а метод класса при передаче как значение его бы потерял.
   */
  readonly acquireRequestSlot = (): Promise<void> => this.throttle.acquire();

  parseUrl(rawUrl: string | null | undefined): string | null {
    return parseHhVacancyId(rawUrl);
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

    // Строго без query: robots.txt hh.ru запрещает `Disallow: *?*` для `User-agent: *`.
    const path = `${HH_VACANCY_PAGE_PATH}/${encodeURIComponent(vacancyId)}`;

    try {
      const response = await firstValueFrom(this.http.get<unknown>(path));

      return this.interpretResponse(response.status, response.data);
    } catch (error) {
      // Сюда попадает только транспорт: таймаут, DNS, отказ в соединении —
      // HTTP-статусы через validateStatus исключением не становятся.
      const message = describeTransportError(HH_TRANSPORT_ERROR_MESSAGE, error);

      this.logger.warn(`Вакансия ${vacancyId}: ${message}`);

      return { result: { outcome: SYNC_OUTCOME.ERROR, message }, retryable: false };
    }
  }

  private interpretResponse(
    status: number,
    payload: unknown,
  ): VacancyRequestAttempt<VacancyFetchResult> {
    if (status === OK_STATUS) {
      const vacancy = parseHhVacancyPage(payload, this.siteBaseUrl);

      if (vacancy === null) {
        // Тело не логируем — только длину, чтобы не заносить в лог всю HTML-страницу.
        const length = typeof payload === 'string' ? payload.length : 0;

        this.logger.warn(`${HH_PAGE_UNPARSABLE_MESSAGE} (длина ответа: ${length})`);

        return {
          result: { outcome: SYNC_OUTCOME.ERROR, message: HH_PAGE_UNPARSABLE_MESSAGE },
          retryable: false,
        };
      }

      // Автозаполнение (§4.4) деградировало, но синхронизация (§4.3) работает —
      // archived уже подтверждён, поэтому это предупреждение, а не ошибка.
      if (vacancy.name === null && vacancy.employerName === null) {
        this.logger.warn(HH_JSON_LD_MISSING_MESSAGE);
      }

      return { result: { outcome: SYNC_OUTCOME.OK, vacancy }, retryable: false };
    }

    if (status === NOT_FOUND_STATUS) {
      // §4.3: штатный исход, а не ошибка — вакансию сняли с публикации.
      return {
        result: { outcome: SYNC_OUTCOME.NOT_FOUND, message: HH_NOT_FOUND_MESSAGE },
        retryable: false,
      };
    }

    if (status === FORBIDDEN_STATUS) {
      // Блокировка по User-Agent или IP: повтором не лечится.
      return {
        result: { outcome: SYNC_OUTCOME.ERROR, message: HH_FORBIDDEN_MESSAGE },
        retryable: false,
      };
    }

    if (status === RATE_LIMITED_STATUS) {
      return {
        result: { outcome: SYNC_OUTCOME.RATE_LIMITED, message: HH_RATE_LIMITED_MESSAGE },
        retryable: true,
      };
    }

    const message = `${HH_UNEXPECTED_STATUS_MESSAGE} ${status}`;

    // Ретраим только 5xx: прочие 4xx (400 без User-Agent) повтором не лечатся.
    return {
      result: { outcome: SYNC_OUTCOME.ERROR, message },
      retryable: status >= SERVER_ERROR_MIN_STATUS,
    };
  }
}
