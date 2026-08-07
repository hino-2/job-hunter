import type { SYNC_OUTCOME } from '../applications/applications.constants';
import type { HhFetchFailureOutcome, HhFetchResult } from './hh.type';

/**
 * Провалидированный срез ответа hh.ru (§4.1). Только те поля, которые реально
 * используются; сырой JSON дальше hh-api.service не уходит.
 *
 * name и employerName nullable: у анонимных вакансий работодателя в ответе может
 * не быть, а автозаполнение (§4.4) — необязательный сервис, а не условие успеха.
 */
export interface HhVacancy {
  name: string | null;
  archived: boolean;
  typeId: string;
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

/** Тело ответа POST /api/hh/preview (§5.3). Реализуется HhPreviewDto. */
export interface HhPreviewResponse {
  hhVacancyId: string | null;
  company: string | null;
  position: string | null;
  archived: boolean | null;
  vacancyType: string | null;
}
