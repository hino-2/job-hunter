import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

import { SYNC_OUTCOME } from '../applications/applications.constants';
import { delay } from '../common/async.helpers';
import { SERVER_ERROR_MIN_STATUS } from '../common/common.constants';
import {
  HH_FORBIDDEN_MESSAGE,
  HH_FORBIDDEN_STATUS,
  HH_JSON_LD_MISSING_MESSAGE,
  HH_MAX_RETRIES_ENV_KEY,
  HH_NOT_FOUND_MESSAGE,
  HH_NOT_FOUND_STATUS,
  HH_OK_STATUS,
  HH_PAGE_UNPARSABLE_MESSAGE,
  HH_RATE_LIMITED_MESSAGE,
  HH_RATE_LIMITED_STATUS,
  HH_RETRY_BACKOFF_FACTOR,
  HH_RETRY_BASE_DELAY_MS,
  HH_RETRY_MAX_DELAY_MS,
  HH_TRANSPORT_ERROR_MESSAGE,
  HH_UNEXPECTED_STATUS_MESSAGE,
  HH_VACANCY_PAGE_PATH,
} from './hh.constants';
import { parseHhVacancyPage } from './hh-page.parser';
import type { HhRequestAttempt } from './hh.interfaces';
import type { HhFetchResult } from './hh.type';

/** §4.6: 500 мс, 1500 мс, далее с тем же множителем, но не дольше потолка. */
function computeRetryDelay(attempt: number): number {
  const backoff = HH_RETRY_BASE_DELAY_MS * HH_RETRY_BACKOFF_FACTOR ** attempt;

  return Math.min(backoff, HH_RETRY_MAX_DELAY_MS);
}

function describeTransportError(error: unknown): string {
  const reason = error instanceof Error ? error.message : String(error);

  return `${HH_TRANSPORT_ERROR_MESSAGE}: ${reason}`;
}

/**
 * Единственная точка обращения к hh.ru (§4.1): загрузка HTML-страницы вакансии,
 * таймаут, ретраи (§4.6) и разбор ответа через parseHhVacancyPage. Исключения наружу
 * не выпускает — любой сбой превращается в исход из §4.5, потому что вызывающему
 * (preview в §5.3 и синхронизации в §5.2) нужно различать «снята», «лимит», «ошибка»,
 * а не ловить разнородные ошибки axios.
 *
 * Анонимный JSON API hh.ru отвечает 403 (поддержка для роли «соискатель» прекращена),
 * поэтому единственный доступный источник — публичная HTML-страница вакансии.
 */
@Injectable()
export class HhApiService {
  private readonly logger = new Logger(HhApiService.name);
  private readonly maxRetries: number;

  constructor(
    private readonly http: HttpService,
    configService: ConfigService,
  ) {
    this.maxRetries = configService.getOrThrow<number>(HH_MAX_RETRIES_ENV_KEY);
  }

  async fetchVacancy(vacancyId: string): Promise<HhFetchResult> {
    let attempt = 0;

    for (;;) {
      const { result, retryable } = await this.requestVacancy(vacancyId);

      if (!retryable || attempt >= this.maxRetries) {
        return result;
      }

      const pause = computeRetryDelay(attempt);

      this.logger.warn(
        `Повтор запроса вакансии ${vacancyId} через ${pause} мс` +
          ` (попытка ${attempt + 1} из ${this.maxRetries}), исход: ${result.outcome}`,
      );
      await delay(pause);
      attempt += 1;
    }
  }

  private async requestVacancy(vacancyId: string): Promise<HhRequestAttempt> {
    // Строго без query: robots.txt hh.ru запрещает `Disallow: *?*` для `User-agent: *`.
    const path = `${HH_VACANCY_PAGE_PATH}/${encodeURIComponent(vacancyId)}`;

    try {
      const response = await firstValueFrom(this.http.get<unknown>(path));

      return this.interpretResponse(response.status, response.data);
    } catch (error) {
      // Сюда попадает только транспорт: таймаут, DNS, отказ в соединении —
      // HTTP-статусы через validateStatus исключением не становятся.
      const message = describeTransportError(error);

      this.logger.warn(`Вакансия ${vacancyId}: ${message}`);

      return { result: { outcome: SYNC_OUTCOME.ERROR, message }, retryable: false };
    }
  }

  private interpretResponse(status: number, payload: unknown): HhRequestAttempt {
    if (status === HH_OK_STATUS) {
      const vacancy = parseHhVacancyPage(payload);

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

    if (status === HH_NOT_FOUND_STATUS) {
      // §4.3: штатный исход, а не ошибка — вакансию сняли с публикации.
      return {
        result: { outcome: SYNC_OUTCOME.NOT_FOUND, message: HH_NOT_FOUND_MESSAGE },
        retryable: false,
      };
    }

    if (status === HH_FORBIDDEN_STATUS) {
      // Блокировка по User-Agent или IP: повтором не лечится.
      return {
        result: { outcome: SYNC_OUTCOME.ERROR, message: HH_FORBIDDEN_MESSAGE },
        retryable: false,
      };
    }

    if (status === HH_RATE_LIMITED_STATUS) {
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
