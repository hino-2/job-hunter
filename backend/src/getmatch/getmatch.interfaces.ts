import type { Vacancy } from '../vacancies/vacancies.interfaces';
import { GETMATCH_PAGE_STATE } from './getmatch.constants';

/** `initialVacancy` — объект, разбор прошёл успешно (§4.9). */
export interface GetmatchPageParsed {
  state: typeof GETMATCH_PAGE_STATE.PARSED;
  vacancy: Vacancy;
}

/**
 * `initialVacancy: null` — HTTP 200, но вакансии не существует (§4.9). В отличие
 * от hh.ru, «нет вакансии» здесь не выражается статусом ответа, а решается только
 * содержимым payload.
 */
export interface GetmatchPageAbsent {
  state: typeof GETMATCH_PAGE_STATE.ABSENT;
}

/** Ключа `initialVacancy` нет вовсе, либо JSON вокруг него не распознан. */
export interface GetmatchPageUnparsable {
  state: typeof GETMATCH_PAGE_STATE.UNPARSABLE;
}
