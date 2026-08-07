import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

import { SYNC_OUTCOME } from '../applications/applications.constants';
import { delay } from '../common/async.helpers';
import { SERVER_ERROR_MIN_STATUS } from '../common/common.constants';
import {
  HH_INVALID_PAYLOAD_MESSAGE,
  HH_MAX_RETRIES_ENV_KEY,
  HH_NOT_FOUND_MESSAGE,
  HH_NOT_FOUND_STATUS,
  HH_OK_STATUS,
  HH_RATE_LIMITED_MESSAGE,
  HH_RATE_LIMITED_STATUS,
  HH_RETRY_BACKOFF_FACTOR,
  HH_RETRY_BASE_DELAY_MS,
  HH_RETRY_MAX_DELAY_MS,
  HH_TRANSPORT_ERROR_MESSAGE,
  HH_UNEXPECTED_STATUS_MESSAGE,
  HH_VACANCIES_PATH,
  HH_VACANCY_FIELD,
} from './hh.constants';
import type { HhRequestAttempt, HhVacancy } from './hh.interfaces';
import type { HhFetchResult } from './hh.type';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(source: Record<string, unknown>, key: string): string | null {
  const value = source[key];

  return typeof value === 'string' ? value : null;
}

/**
 * Сужение ответа hh.ru до полей, которые нам нужны (§4.1). Тип внешних данных
 * неизвестен, поэтому вход — unknown, а не интерфейс: интерфейс здесь был бы
 * обещанием, которого чужой сервис не давал.
 *
 * archived и type.id обязательны: именно на них построены правила §4.3, и без них
 * ответ бесполезен — такой случай считается «невалидным JSON» (§4.5, исход ERROR).
 * name и employer.name опциональны: они питают только автозаполнение (§4.4).
 */
function toHhVacancy(payload: unknown): HhVacancy | null {
  if (!isRecord(payload)) {
    return null;
  }

  const archived = payload[HH_VACANCY_FIELD.ARCHIVED];
  const type = payload[HH_VACANCY_FIELD.TYPE];

  if (typeof archived !== 'boolean' || !isRecord(type)) {
    return null;
  }

  const typeId = readString(type, HH_VACANCY_FIELD.ID);

  if (typeId === null) {
    return null;
  }

  const employer = payload[HH_VACANCY_FIELD.EMPLOYER];

  return {
    name: readString(payload, HH_VACANCY_FIELD.NAME),
    archived,
    typeId,
    employerName: isRecord(employer) ? readString(employer, HH_VACANCY_FIELD.NAME) : null,
  };
}

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
 * Единственная точка обращения к публичному API hh.ru (§4.1): таймаут, ретраи (§4.6)
 * и разбор ответа. Исключения наружу не выпускает — любой сбой превращается в исход
 * из §4.5, потому что вызывающему (preview в §5.3 и синхронизации в §5.2) нужно
 * различать «снята», «лимит», «ошибка», а не ловить разнородные ошибки axios.
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
    const path = `${HH_VACANCIES_PATH}/${encodeURIComponent(vacancyId)}`;

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
      const vacancy = toHhVacancy(payload);

      if (vacancy === null) {
        this.logger.warn(HH_INVALID_PAYLOAD_MESSAGE);

        return {
          result: { outcome: SYNC_OUTCOME.ERROR, message: HH_INVALID_PAYLOAD_MESSAGE },
          retryable: false,
        };
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

    if (status === HH_RATE_LIMITED_STATUS) {
      return {
        result: { outcome: SYNC_OUTCOME.RATE_LIMITED, message: HH_RATE_LIMITED_MESSAGE },
        retryable: true,
      };
    }

    const message = `${HH_UNEXPECTED_STATUS_MESSAGE} ${status}`;

    // Ретраим только 5xx: прочие 4xx (400 без User-Agent, 403) повтором не лечатся.
    return {
      result: { outcome: SYNC_OUTCOME.ERROR, message },
      retryable: status >= SERVER_ERROR_MIN_STATUS,
    };
  }
}
