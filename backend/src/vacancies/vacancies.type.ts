import type { SYNC_OUTCOME } from '../applications/applications.constants';
import type { SyncOutcome } from '../applications/applications.type';
import type { VacancyFetchFailure, VacancyFetchSuccess } from './vacancies.interfaces';

/**
 * Исходы одного обращения к источнику вакансии. Это подмножество SyncOutcome (§4.5)
 * без SKIPPED_UNSUPPORTED: «источник не распознан» решается парсером URL ещё до
 * запроса, то есть ни один провайдер такой исход вернуть не может.
 *
 * Именно подмножество, а не собственный enum: значение уходит в колонку
 * last_sync_outcome, и два независимых списка неминуемо разъехались бы.
 */
export type VacancyFetchOutcome = Exclude<SyncOutcome, typeof SYNC_OUTCOME.SKIPPED_UNSUPPORTED>;

export type VacancyFetchFailureOutcome = Exclude<VacancyFetchOutcome, typeof SYNC_OUTCOME.OK>;

/** Дискриминант — outcome: при OK доступна vacancy, иначе message. */
export type VacancyFetchResult = VacancyFetchSuccess | VacancyFetchFailure;
