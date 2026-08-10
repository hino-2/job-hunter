import type { SYNC_OUTCOME } from '../applications/applications.constants';
import type {
  ApplicationSyncPatch,
  SyncOutcome,
  VacancySource,
} from '../applications/applications.type';
import type {
  VacancyFetchFailureOutcome,
  VacancyFetchOutcome,
  VacancyFetchResult,
} from './vacancies.type';

/**
 * Провалидированный срез страницы вакансии, общий для всех источников (§4.3).
 *
 * archived обязателен: на нём построены правила §4.3, его отсутствие или
 * противоречивость делает ответ бесполезным для синхронизации (исход ERROR).
 * name и employerName деградируют мягко (§4.4): они питают только автозаполнение,
 * отсутствие данных на странице — не ошибка разбора.
 */
export interface Vacancy {
  name: string | null;
  archived: boolean;
  employerName: string | null;
}

/** Пара «источник + внешний ID», уже распознанная реестром из пользовательской ссылки. */
export interface VacancyRef {
  source: VacancySource;
  externalId: string;
}

export interface VacancyFetchSuccess {
  outcome: typeof SYNC_OUTCOME.OK;
  vacancy: Vacancy;
}

export interface VacancyFetchFailure {
  outcome: VacancyFetchFailureOutcome;
  /** Человекочитаемый текст для last_sync_error (§3.1) и для тела ответа preview. */
  message: string;
}

/**
 * Результат одной попытки запроса плюс признак, имеет ли смысл её повторять.
 * Флаг живёт отдельно от VacancyFetchResult, потому что наружу он не нужен: §4.6
 * разрешает ретраи только на 429 и 5xx, а вызывающий видит уже итоговый исход.
 */
export interface VacancyRequestAttempt {
  result: VacancyFetchResult;
  retryable: boolean;
}

/**
 * Контракт источника вакансии. Реализуют HhApiService и (с фазы B3) GetmatchApiService —
 * каждый сам implements этот интерфейс, отдельных классов-обёрток нет (§3 блюпринта).
 */
export interface VacancySourceProvider {
  readonly source: VacancySource;
  /** Внешний ID вакансии из пользовательской ссылки или null. Никогда не бросает (§4.2). */
  parseUrl(rawUrl: string | null | undefined): string | null;
  /** Исключений наружу не выпускает: любой сбой — исход из §4.5. */
  fetchVacancy(externalId: string): Promise<VacancyFetchResult>;
}

/**
 * Результат распознавания ссылки: ref и уже найденный провайдер — чтобы вызывающему
 * не приходилось второй раз обращаться в реестр и проверять null.
 */
export interface VacancyResolution {
  ref: VacancyRef;
  provider: VacancySourceProvider;
}

export interface VacancyRetryOptions {
  maxRetries: number;
  onRetry(pauseMs: number, attempt: number, outcome: VacancyFetchOutcome): void;
}

/** Имена env-переменных, из которых собираются опции axios конкретного источника. */
export interface VacancyHttpEnvKeys {
  baseUrl: string;
  timeoutMs: string;
  userAgent: string;
}

/** Решение по одной записи до её сохранения (§4.3): какие колонки записать и что показать. */
export interface VacancySyncDecision {
  patch: ApplicationSyncPatch;
  outcome: SyncOutcome;
  /** null только при OK; иначе тот же текст, что уходит в last_sync_error. */
  message: string | null;
}

/** Тело ответа POST /api/vacancies/preview (§5.3). Реализуется VacancyPreviewDto. */
export interface VacancyPreviewResponse {
  source: VacancySource | null;
  vacancyExternalId: string | null;
  company: string | null;
  position: string | null;
  archived: boolean | null;
}
