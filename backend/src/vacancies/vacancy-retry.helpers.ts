import { delay } from '../common/async.helpers';
import {
  VACANCY_RETRY_BACKOFF_FACTOR,
  VACANCY_RETRY_BASE_DELAY_MS,
  VACANCY_RETRY_MAX_DELAY_MS,
} from './vacancies.constants';
import type { VacancyRequestAttempt, VacancyRetryOptions } from './vacancies.interfaces';

/** §4.6: 500 мс, 1500 мс, далее с тем же множителем, но не дольше потолка. */
function computeRetryDelay(attempt: number): number {
  const backoff = VACANCY_RETRY_BASE_DELAY_MS * VACANCY_RETRY_BACKOFF_FACTOR ** attempt;

  return Math.min(backoff, VACANCY_RETRY_MAX_DELAY_MS);
}

/**
 * §4.6: одна попытка + до maxRetries повторов с backoff, только пока requestOnce
 * сообщает retryable. Логирование — через onRetry, чтобы каждый источник писал
 * своим Logger'ом и своим текстом; сам хелпер о существовании Logger'а не знает.
 *
 * Обобщённый цикл ретраев hh-api.service.ts (§4.6): раньше жил внутри HhApiService,
 * теперь общий для всех источников вакансий — копировать его в getmatch было бы
 * дублированием одного и того же требования. Обобщён по TResult (шаг 22, §4.11.2):
 * HhSearchService (страницы выдачи и описания, hh.type.ts) переиспользует тот же
 * цикл ретраев и backoff, хотя его результаты не являются VacancyFetchResult.
 */
export async function fetchWithRetries<TResult>(
  options: VacancyRetryOptions<TResult>,
  requestOnce: () => Promise<VacancyRequestAttempt<TResult>>,
): Promise<TResult> {
  let attempt = 0;

  for (;;) {
    const { result, retryable } = await requestOnce();

    if (!retryable || attempt >= options.maxRetries) {
      return result;
    }

    const pause = computeRetryDelay(attempt);

    options.onRetry(pause, attempt, result);
    await delay(pause);
    attempt += 1;
  }
}

/** «<prefix>: <причина>» для транспортных сбоев (таймаут, DNS, отказ в соединении). */
export function describeTransportError(prefix: string, error: unknown): string {
  const reason = error instanceof Error ? error.message : String(error);

  return `${prefix}: ${reason}`;
}
