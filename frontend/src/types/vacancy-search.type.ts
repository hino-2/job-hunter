import type {
  MATCH_SOURCE,
  SCAN_MODE,
  SCAN_STATUS,
  SCAN_STOPPED_REASON,
  VACANCY_LEAD_SEARCH_SOURCES,
  VACANCY_LEADS_HIDDEN_FILTERS,
  VACANCY_LEADS_ORDERS,
  VACANCY_LEADS_SORT_FIELDS,
} from '../constants/vacancy-search.constants';
import type { ScanResumeState } from './vacancy-search.interfaces';

/** §4.12: кто подтвердил соответствие вакансии профилю — детерминированный отбор или ИИ. */
export type MatchSource = (typeof MATCH_SOURCE)[keyof typeof MATCH_SOURCE];

/** §5.7: значения query-параметра hidden у GET /api/vacancy-leads. */
export type VacancyLeadsHiddenFilter = (typeof VACANCY_LEADS_HIDDEN_FILTERS)[number];

/** §5.7: допустимые значения query-параметра sort. */
export type VacancyLeadsSortField = (typeof VACANCY_LEADS_SORT_FIELDS)[number];

export type VacancyLeadsOrder = (typeof VACANCY_LEADS_ORDERS)[number];

/** §4.11.9/§5.7: статус прогона поиска. */
export type ScanStatusValue = (typeof SCAN_STATUS)[keyof typeof SCAN_STATUS];

/** §4.11.11: причина остановки прогона. */
export type ScanStoppedReason = (typeof SCAN_STOPPED_REASON)[keyof typeof SCAN_STOPPED_REASON];

/** §4.11.12: режим старта прогона — с нуля («Начать поиск») либо с сохранённой позиции («Продолжить»). */
export type ScanMode = (typeof SCAN_MODE)[keyof typeof SCAN_MODE];

/**
 * §5.7: источник поиска лидов — подмножество VacancySource, у которого есть поиск
 * по выдаче (hh.ru и it-vacancies.ru). getmatch.ru умеет только синхронизацию отклика
 * (§4.8), поэтому в поле source запроса POST /api/vacancy-leads/scan не допускается.
 */
export type VacancyLeadSearchSource = (typeof VACANCY_LEAD_SEARCH_SOURCES)[number];

/**
 * §5.7: состояние «можно продолжить» отдельно по каждому источнику поиска — позиция
 * прогона хранится по строке на источник (§3.7), и «Продолжить» доступна ровно для
 * того источника, что выбран в панели фильтров.
 */
export type ScanResumeStateBySource = Readonly<Record<VacancyLeadSearchSource, ScanResumeState>>;
