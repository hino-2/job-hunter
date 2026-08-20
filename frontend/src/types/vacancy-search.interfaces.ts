import type { VacancySource } from './application.type';
import type {
  MatchSource,
  ScanMode,
  ScanResumeStateBySource,
  ScanStatusValue,
  ScanStoppedReason,
  VacancyLeadSearchSource,
  VacancyLeadsHiddenFilter,
  VacancyLeadsOrder,
  VacancyLeadsSortField,
} from './vacancy-search.type';

/**
 * Запись найденной вакансии (§5.7, §3.5). Ручная копия VacancyLeadDto
 * (backend/src/vacancy-search/dto/vacancy-lead.dto.ts) — порядок и имена полей
 * совпадают построчно, тем же приёмом, что и Application (§3.4). Описания вакансии
 * здесь нет и не будет: оно не хранится в БД (§3.5, §4.11.7), читается на hh.ru
 * по кнопке ↗ (vacancyUrl).
 */
export interface VacancyLead {
  id: string;
  source: VacancySource;
  externalId: string;
  position: string;
  company: string;
  hasCompanyLogo: boolean;
  vacancyUrl: string;
  publishedAt: string | null;
  publishedOn: string;
  areaName: string | null;
  salaryFrom: number | null;
  salaryTo: number | null;
  salaryCurrency: string | null;
  salaryGross: boolean | null;
  experience: string | null;
  employmentForm: string | null;
  workFormats: string[] | null;
  matchedKeywords: string[] | null;
  matchSource: MatchSource;
  aiModel: string | null;
  aiTitleReason: string | null;
  aiDescriptionReason: string | null;
  hidden: boolean;
  hasApplication: boolean;
  firstSeenAt: string;
  lastSeenAt: string;
}

/**
 * Query-параметры GET /api/vacancy-leads (§5.7) — все опциональны, дефолты
 * (exclude / publishedAt / desc) применяет бэкенд.
 */
export interface VacancyLeadsQueryParams {
  search?: string;
  hidden?: VacancyLeadsHiddenFilter;
  sort?: VacancyLeadsSortField;
  order?: VacancyLeadsOrder;
}

/**
 * Тело PATCH /api/vacancy-leads/:id (§5.7) — ровно одно поле. Ставит либо снимает
 * hidden_at (§3.5, §7.9.3); повторный вызов с тем же значением идемпотентен.
 */
export interface VacancyLeadUpdate {
  hidden: boolean;
}

/** Ответ 202 POST /api/vacancy-leads/scan (§5.7, §4.11.9) — прогон запущен, не дожидаясь конца. */
export interface ScanAcceptedResponse {
  status: 'RUNNING';
  startedAt: string;
}

/**
 * Тело POST /api/vacancy-leads/scan (§5.7, §4.11.12) — режим старта прогона и источник
 * выдачи. source на сервере опционален (дефолт HH), но фронт всегда шлёт его явно:
 * в панели фильтров источник выбран всегда, и неявный дефолт разошёлся бы с тем,
 * что видит пользователь.
 */
export interface StartScanRequest {
  mode: ScanMode;
  source: VacancyLeadSearchSource;
}

/** Ответ 202 POST /api/vacancy-leads/scan/stop (§5.7, §4.11.12) — остановка запрошена, статус ещё RUNNING. */
export interface ScanStopAcceptedResponse {
  status: 'RUNNING';
  stopRequested: true;
}

/**
 * §4.11.11: живые счётчики прогресса прогона — те же поля, что и в итоговой сводке
 * (ScanStatusResponse.progress) что во время прогона, что после.
 */
export interface ScanProgress {
  pagesFetched: number;
  itemsSeen: number;
  skippedInvalid: number;
  skippedOld: number;
  skippedExcluded: number;
  rejectedTitle: number;
  duplicates: number;
  descriptionsFailed: number;
  rejectedDescription: number;
  created: number;
  failed: number;
  aiFallbacks: number;
}

/** §5.7, §4.11.12: индикатор «страница N из M». currentPage — 0-based индекс, totalPages — количество. */
export interface ScanPageProgress {
  currentPage: number | null;
  totalPages: number;
}

/**
 * §7.9.2: пункт выпадающего списка «Источник» в панели фильтров — значение поля source
 * запроса и подпись из VACANCY_SOURCE_LABELS.
 */
export interface LeadSearchSourceOption {
  value: VacancyLeadSearchSource;
  label: string;
}

/** §5.7, §4.11.12: можно ли продолжить прогон с сохранённой позиции. */
export interface ScanResumeState {
  available: boolean;
  nextPage: number | null;
}

/** Ответ GET /api/vacancy-leads/scan/status (§5.7): прогресс во время прогона, итог после. */
export interface ScanStatusResponse {
  status: ScanStatusValue;
  startedAt: string | null;
  finishedAt: string | null;
  progress: ScanProgress;
  pageProgress: ScanPageProgress;
  stopRequested: boolean;
  /**
   * §5.7: позиция для продолжения — по строке на источник (§3.7). Кнопка «Продолжить»
   * читает срез выбранного источника, а не одно общее значение.
   */
  resumeBySource: ScanResumeStateBySource;
  /** §5.7: источник идущего прогона, а после его окончания — последнего завершённого. */
  source: VacancySource | null;
  stoppedReason: ScanStoppedReason | null;
  message: string | null;
}

/**
 * Ответ GET/PUT /api/vacancy-search-settings (§3.6, §5.7). searchUrlTemplate — обычное
 * поле настроек, редактируемое в диалоге (§7.9.4), а не значение env; уже содержит
 * собственный текст поиска (query-параметр text= выдачи hh.ru), а не значение env.
 */
export interface VacancySearchSettings {
  keywords: string[];
  excludeKeywords: string[];
  titlePrompt: string;
  descriptionPrompt: string;
  aiEnabled: boolean;
  searchUrlTemplate: string;
  /** §3.6, §5.7: тот же шаблон для второго источника лидов — выдачи it-vacancies.ru. */
  itVacanciesSearchUrlTemplate: string;
  updatedAt: string;
}

/**
 * Тело PUT /api/vacancy-search-settings (§5.7) — все поля настроек, кроме updatedAt;
 * форма всегда отправляет его целиком (ресурс один).
 */
export interface VacancySearchSettingsUpdate {
  keywords: string[];
  excludeKeywords: string[];
  titlePrompt: string;
  descriptionPrompt: string;
  aiEnabled: boolean;
  searchUrlTemplate: string;
  itVacanciesSearchUrlTemplate: string;
}

/**
 * Состояние панели фильтров экрана «Вакансии» (§7.9.1, §7.9.3). search хранится
 * «как введено», тем же приёмом, что ApplicationsFilters. showHiddenOnly — булев
 * переключатель «Скрытые», а не сырое значение query-параметра hidden: тумблер
 * в UI двоичный (показать скрытые либо нет), а третье значение 'all' нигде
 * в интерфейсе не нужно.
 */
export interface VacancyLeadsFilters {
  search: string;
  showHiddenOnly: boolean;
  sort: VacancyLeadsSortField;
  order: VacancyLeadsOrder;
}
