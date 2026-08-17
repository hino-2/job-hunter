import type { VacancySource } from '../applications/applications.type';
import type { HhSearchItem } from '../hh/hh.interfaces';
import type { MatchSource, ScanStatus, ScanStoppedReason } from './vacancy-search.type';

/**
 * §5.7: снимок настроек поиска с уже разобранными списками ключевых/стоп-слов
 * (parseKeywordList, vacancy-keywords.helpers.ts). Конвейер отбора (§4.11.4, vacancy-scan.service.ts)
 * обязан брать снимок ровно один раз при старте прогона — «изменения применяются
 * со следующего прогона», иначе половина выдачи судилась бы одним промптом,
 * половина другим.
 */
export interface VacancySearchSettingsSnapshot {
  keywords: string[];
  excludeKeywords: string[];
  titlePrompt: string;
  descriptionPrompt: string;
  aiEnabled: boolean;
  /** §3.6/§4.11.1/§5.7: читается один раз при старте прогона, как и остальные поля снимка. */
  searchUrlTemplate: string;
  updatedAt: Date;
}

/** §4.11.5: тройка компания+должность+дата — материализованный ключ дедупликации (vacancy-lead-key.helpers.ts). */
export interface VacancyLeadDedupKey {
  companyKey: string;
  positionKey: string;
  publishedOn: string;
}

/** §4.11.11: счётчики сводки прогона — те же поля отдаёт GET .../scan/status во время прогона. */
export interface VacancyScanProgress {
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

/**
 * §4.11.9: ручка текущего прогона, которую tryStart() отдаёт вызывающему (vacancy-scan.service.ts).
 * increment мутирует ВНУТРЕННЕЕ состояние VacancyScanStateService — наружу (GET .../scan/status)
 * уходит только копия через snapshot().
 */
export interface ScanRunHandle {
  increment(counter: keyof VacancyScanProgress, delta?: number): void;
  /** Кооперативная отмена (§4.11.12): проверяется в тех же точках, что и дедлайн. */
  isStopRequested(): boolean;
  /** Абсолютный 0-based номер страницы выдачи, которая обрабатывается прямо сейчас. */
  setCurrentPage(page: number): void;
  setTotalPages(total: number): void;
}

/** §5.7, §4.11.12: индикатор «страница N из M». currentPage — 0-based индекс, totalPages — количество. */
export interface VacancyScanPageProgress {
  currentPage: number | null;
  totalPages: number;
}

/** §3.7: сохранённая позиция прогона и ссылка на выдачу, при которой она была взята. */
export interface VacancyScanPositionSnapshot {
  nextPage: number;
  searchUrlTemplate: string | null;
}

/** §5.7, §4.11.12: можно ли продолжить прогон с сохранённой позиции. */
export interface VacancyScanResumeState {
  available: boolean;
  nextPage: number | null;
}

/** §5.7: тело GET .../scan/status — статус, прогресс и итог последнего прогона. */
export interface VacancyScanStateSnapshot {
  status: ScanStatus;
  startedAt: Date | null;
  finishedAt: Date | null;
  progress: VacancyScanProgress;
  pageProgress: VacancyScanPageProgress;
  stopRequested: boolean;
  stoppedReason: ScanStoppedReason | null;
  message: string | null;
}

/**
 * §3.5: полный набор полей для INSERT ... ON CONFLICT DO NOTHING (vacancy-leads.service.ts).
 * Собирает vacancy-lead.builder.ts — единственное место среза значений по ширине колонки.
 */
export interface VacancyLeadInsertRow {
  source: VacancySource;
  externalId: string;
  position: string;
  company: string;
  positionKey: string;
  companyKey: string;
  publishedOn: string;
  publishedAt: Date | null;
  vacancyUrl: string;
  areaName: string | null;
  salaryFrom: number | null;
  salaryTo: number | null;
  salaryCurrency: string | null;
  salaryGross: boolean | null;
  experience: string | null;
  employmentForm: string | null;
  workFormats: string | null;
  matchedKeywords: string | null;
  matchSource: MatchSource;
  aiModel: string | null;
  aiTitleReason: string | null;
  aiDescriptionReason: string | null;
}

/** Вход buildVacancyLeadRow (vacancy-lead.builder.ts) — уже принятое решение конвейера, не сырые данные источника. */
export interface VacancyLeadRowInput {
  item: HhSearchItem;
  positionKey: string;
  companyKey: string;
  publishedOn: string;
  matchedKeywords: string[];
  matchSource: MatchSource;
  aiModel: string | null;
  aiTitleReason: string | null;
  aiDescriptionReason: string | null;
}

/**
 * §4.11.4: кандидат страницы, переживший этап 0 (стоп-слова), внутрипрогонную
 * дедупликацию (эшелон 1) и дедупликацию по БД (эшелон 2) — то есть уже прошедший
 * оба эшелона дедупликации ДО ИИ по названию.
 */
export interface VacancyScanSurvivor {
  item: HhSearchItem;
  dedupKey: VacancyLeadDedupKey;
}

/**
 * §4.10, §4.11: логотип компании лида, разобранный из уже загруженной страницы
 * вакансии (§4.11.7). Оба поля непустые — отсутствие логотипа выражается значением
 * `VacancyLeadLogoSource | null` целиком, а не null отдельных полей (тот же принцип,
 * что у Vacancy.logoUrl/logoAllowedHostPattern).
 */
export interface VacancyLeadLogoSource {
  logoUrl: string;
  allowedHostPattern: RegExp;
}

/** §4.11.4: итог этапа 2 (ИИ по названию либо детерминированный фолбэк на ключевые слова). */
export interface VacancyTitleDecision {
  item: HhSearchItem;
  dedupKey: VacancyLeadDedupKey;
  matches: boolean;
  matchSource: MatchSource;
  matchedKeywords: string[];
  aiTitleReason: string | null;
}

/**
 * Счётчик открытых страниц вакансий (§4.11.8, VACANCY_SCAN_MAX_DETAILS), общий на весь
 * прогон (несколько страниц выдачи) — объект, а не примитив, чтобы processPage мог
 * инкрементировать его по ссылке без возврата значения наружу.
 */
export interface VacancyScanDetailsBudget {
  opened: number;
}
