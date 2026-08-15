import type { VacancySource } from './application.type';
import type {
  MatchSource,
  ScanStatusValue,
  ScanStoppedReason,
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

/** Ответ GET /api/vacancy-leads/scan/status (§5.7): прогресс во время прогона, итог после. */
export interface ScanStatusResponse {
  status: ScanStatusValue;
  startedAt: string | null;
  finishedAt: string | null;
  progress: ScanProgress;
  stoppedReason: ScanStoppedReason | null;
  message: string | null;
}

/**
 * Ответ GET/PUT /api/vacancy-search-settings (§3.6, §5.7). searchUrlTemplate — только
 * на чтение (значение env), нужен для предпросмотра итогового URL при наборе строки
 * поиска (§7.9.4); в теле PUT его нет.
 */
export interface VacancySearchSettings {
  searchText: string;
  keywords: string[];
  excludeKeywords: string[];
  titlePrompt: string;
  descriptionPrompt: string;
  aiEnabled: boolean;
  searchUrlTemplate: string;
  updatedAt: string;
}

/**
 * Тело PUT /api/vacancy-search-settings (§5.7) — все поля настроек, кроме
 * searchUrlTemplate и updatedAt; форма всегда отправляет его целиком (ресурс один).
 */
export interface VacancySearchSettingsUpdate {
  searchText: string;
  keywords: string[];
  excludeKeywords: string[];
  titlePrompt: string;
  descriptionPrompt: string;
  aiEnabled: boolean;
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
