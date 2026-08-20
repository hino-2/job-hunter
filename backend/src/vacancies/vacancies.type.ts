import type { SYNC_OUTCOME } from '../applications/applications.constants';
import type { SyncOutcome } from '../applications/applications.type';
import type { VACANCY_LEAD_SEARCH_SOURCES } from './vacancies.constants';
import type {
  VacancyFetchFailure,
  VacancyFetchSuccess,
  VacancySearchPage,
} from './vacancies.interfaces';

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

/**
 * §4.11.1: источник, у которого есть поиск лидов. Подмножество VacancySource, а не
 * собственный enum: этим же значением параметризуются прогон (POST /scan), строка
 * таблицы позиций и карта шаблонов ссылок на выдачу, и два независимых списка
 * неминуемо разъехались бы.
 */
export type VacancyLeadSearchSource = (typeof VACANCY_LEAD_SEARCH_SOURCES)[number];

/**
 * Результаты обращений сервиса поиска лидов (§4.11.2–4.11.3, §4.11.7). Дискриминант —
 * `ok`, а не `outcome` из §4.5: сбой поиска не пишется в applications.last_sync_outcome,
 * это отдельный от синхронизации конвейер (§4.11), значения SyncOutcome тут неуместны.
 */
export type VacancySearchPageResult =
  { ok: true; page: VacancySearchPage } | { ok: false; message: string };

/**
 * §4.11.7, §4.10: описание уже приведено к plain text (common/html.helpers.ts), не
 * обрезано. logoUrl/logoAllowedHostPattern — тот же логотип компании, что и у
 * синхронизации (Vacancy.logoUrl): страница вакансии здесь уже загружена ради
 * описания, поэтому её же HTML разбирается и на логотип, без лишнего сетевого
 * запроса. Пара заполняется вместе, как и в Vacancy — logoUrl без allow-list'а
 * не бывает.
 */
export type VacancyDescriptionResult =
  | { ok: true; description: string; logoUrl: string | null; logoAllowedHostPattern: RegExp | null }
  | { ok: false; message: string };
