import type { SYNC_OUTCOME } from '../applications/applications.constants';
import type { SyncOutcome } from '../applications/applications.type';
import type { HhFetchFailure, HhFetchSuccess } from './hh.interfaces';

/**
 * Исходы одного обращения к hh.ru. Это подмножество SyncOutcome (§4.5) без
 * SKIPPED_NOT_HH: «в ссылке нет hh-ID» решается парсером ещё до запроса,
 * то есть HTTP-клиент такой исход вернуть не может.
 *
 * Именно подмножество, а не собственный enum: значение уходит в колонку
 * last_sync_outcome, и два независимых списка неминуемо разъехались бы.
 */
export type HhFetchOutcome = Exclude<SyncOutcome, typeof SYNC_OUTCOME.SKIPPED_NOT_HH>;

export type HhFetchFailureOutcome = Exclude<HhFetchOutcome, typeof SYNC_OUTCOME.OK>;

/** Дискриминант — outcome: при OK доступна vacancy, иначе message. */
export type HhFetchResult = HhFetchSuccess | HhFetchFailure;
