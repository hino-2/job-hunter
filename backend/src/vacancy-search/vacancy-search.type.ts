import type { VACANCY_MATCH_MODES, VACANCY_PREFILTER_MODES } from '../config/config.constants';
import type { VacancyLeadSearchSource } from '../vacancies/vacancies.type';
import type {
  MATCH_SOURCE,
  SCAN_MODES,
  SCAN_SOURCE_SELECTIONS,
  SCAN_STATUS,
  SCAN_STOPPED_REASON,
  VACANCY_LEADS_HIDDEN_FILTERS,
  VACANCY_LEADS_ORDERS,
  VACANCY_LEADS_SORT_FIELDS,
} from './vacancy-search.constants';
import type { VacancyScanResumeState } from './vacancy-search.interfaces';

/** §4.12: кто подтвердил соответствие вакансии профилю — детерминированный отбор или ИИ. */
export type MatchSource = (typeof MATCH_SOURCE)[keyof typeof MATCH_SOURCE];

/**
 * §4.11.4: сколько включающих ключевых слов должно совпасть на этапе 0
 * (passesPrefilter, vacancy-scan.service.ts), когда VACANCY_PREFILTER_MODE=full —
 * дешёвый детерминированный пре-фильтр перед ИИ, а не режим отбора без ИИ. Тип
 * выведен из VACANCY_MATCH_MODES (config/config.constants.ts) — единственного
 * места, перечисляющего допустимые значения VACANCY_MATCH_MODE (там же валидируется
 * env при старте), а не продублирован здесь отдельным union.
 */
export type VacancyMatchMode = (typeof VACANCY_MATCH_MODES)[number];

/** §4.11.4: что проверяется детерминированно до/вместо ИИ (этап 0). */
export type VacancyPrefilterMode = (typeof VACANCY_PREFILTER_MODES)[number];

/** §4.11.9/§5.7: статус прогона поиска, живущий в памяти процесса (VacancyScanStateService). */
export type ScanStatus = (typeof SCAN_STATUS)[keyof typeof SCAN_STATUS];

/** §4.11.11: почему прогон остановился — бюджет, конец выдачи, отсечка по возрасту, ручная остановка или сбой. */
export type ScanStoppedReason = (typeof SCAN_STOPPED_REASON)[keyof typeof SCAN_STOPPED_REASON];

/** §4.11.12: режим старта прогона — с нуля («Начать») либо с сохранённой позиции («Продолжить»). */
export type ScanMode = (typeof SCAN_MODES)[number];

/**
 * §5.7/§4.11.0: значение поля `source` тела POST /scan — один конкретный источник
 * поиска лидов либо сентинел SCAN_SOURCE_ALL («искать по всем источникам»).
 */
export type ScanSourceSelection = (typeof SCAN_SOURCE_SELECTIONS)[number];

/** §5.7: значения query-параметра hidden у GET /api/vacancy-leads. */
export type VacancyLeadsHiddenFilter = (typeof VACANCY_LEADS_HIDDEN_FILTERS)[number];

export type VacancyLeadsSortField = (typeof VACANCY_LEADS_SORT_FIELDS)[number];

export type VacancyLeadsOrder = (typeof VACANCY_LEADS_ORDERS)[number];

/**
 * §5.7: шаблон ссылки на выдачу по источнику поиска лидов — и в снимке настроек
 * (VacancySearchSettingsSnapshot), и там, где прогон выбирает шаблон по своему
 * source. Record, а не два поля: потребители индексируются значением source, без
 * switch на каждый источник.
 */
export type VacancySearchUrlTemplateBySource = Readonly<Record<VacancyLeadSearchSource, string>>;

/** §5.7: доступность «Продолжить» по каждому источнику поиска — тело GET .../scan/status. */
export type VacancyScanResumeStateBySource = Readonly<
  Record<VacancyLeadSearchSource, VacancyScanResumeState>
>;
