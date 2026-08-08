import type { SYNC_OUTCOME } from '../applications/applications.constants';
import type { ApplicationSyncPatch, SyncOutcome } from '../applications/applications.type';
import type { HhFetchFailureOutcome, HhFetchResult } from './hh.type';

/**
 * Провалидированный срез HTML-страницы вакансии hh.ru (§4.1). Только то, что реально
 * используется; сырая страница дальше hh-api.service не уходит.
 *
 * archived обязателен: на нём построены правила §4.3, без него ответ бесполезен.
 * name и employerName приходят из JSON-LD и nullable: страница может обойтись без
 * блока ld+json или без организации в нём, а автозаполнение (§4.4) — необязательный
 * сервис, а не условие успеха. type.id страница не содержит (снят вместе с JSON API).
 */
export interface HhVacancy {
  name: string | null;
  archived: boolean;
  employerName: string | null;
}

export interface HhFetchSuccess {
  outcome: typeof SYNC_OUTCOME.OK;
  vacancy: HhVacancy;
}

export interface HhFetchFailure {
  outcome: HhFetchFailureOutcome;
  /** Человекочитаемый текст для last_sync_error (§3.1) и для тела ответа preview. */
  message: string;
}

/**
 * Результат одной попытки запроса плюс признак, имеет ли смысл её повторять.
 * Флаг живёт отдельно от HhFetchResult, потому что наружу он не нужен: §4.6
 * разрешает ретраи только на 429 и 5xx, а вызывающий видит уже итоговый исход.
 */
export interface HhRequestAttempt {
  result: HhFetchResult;
  retryable: boolean;
}

/**
 * Решение по одной записи до её сохранения (§4.3): какие колонки записать и что
 * показать пользователю.
 *
 * outcome и message живут рядом с патчем, а не выводятся из него: в ApplicationSyncPatch
 * все поля опциональны, поэтому patch.lastSyncOutcome имел бы тип SyncOutcome | undefined,
 * тогда как исход операции известен всегда.
 */
export interface HhSyncDecision {
  patch: ApplicationSyncPatch;
  outcome: SyncOutcome;
  /** null только при OK; иначе тот же текст, что уходит в last_sync_error. */
  message: string | null;
}

/** Тело ответа POST /api/hh/preview (§5.3). Реализуется HhPreviewDto. */
export interface HhPreviewResponse {
  hhVacancyId: string | null;
  company: string | null;
  position: string | null;
  archived: boolean | null;
  vacancyType: string | null;
}
