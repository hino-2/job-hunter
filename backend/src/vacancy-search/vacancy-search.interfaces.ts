import type { VacancySource } from '../applications/applications.type';
import type {
  VacancyLeadSearchProvider,
  VacancySearchItem,
} from '../vacancies/vacancies.interfaces';
import type { VacancyLeadSearchSource } from '../vacancies/vacancies.type';
import type {
  MatchSource,
  ScanSourceSelection,
  ScanStatus,
  ScanStoppedReason,
  VacancySearchUrlTemplateBySource,
} from './vacancy-search.type';

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
  /**
   * §3.6/§4.11.1/§5.7: шаблоны ссылок на выдачу по источникам, читаются один раз при
   * старте прогона, как и остальные поля снимка. Оба проверены fail-loud, даже если
   * прогон идёт только по одному источнику: повреждённый шаблон соседнего источника
   * лучше обнаружить сразу, а не при следующем запуске.
   */
  searchUrlTemplateBySource: VacancySearchUrlTemplateBySource;
  updatedAt: Date;
}

/** §4.11.5: четвёрка источник+компания+должность+дата — материализованный ключ дедупликации (vacancy-lead-key.helpers.ts). */
export interface VacancyLeadDedupKey {
  source: VacancySource;
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
  /** §4.12.3: батчи/вакансии, пропущенные из-за непригодного ответа модели (AI_FAILURE_KIND.INVALID_RESPONSE). */
  aiSkipped: number;
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
  /** §4.11.9: снимает/поднимает индикатор прогрева модели, отдельный от status (RUNNING не меняется). */
  setAiWarmingUp(value: boolean): void;
  /**
   * §4.11.0: переключает прогон на следующий сегмент («ногу») мультипрогона —
   * источник, чью страницу мы сейчас листаем, и стартовую страницу этой ноги.
   * totalPages сбрасывается на весь бюджет заново (см. VacancyScanStateService) —
   * иначе прогресс второй ноги считался бы относительно lastPage первой.
   */
  startSource(source: VacancySource, startPage: number): void;
}

/** §5.7, §4.11.12: индикатор «страница N из M». currentPage — 0-based индекс, totalPages — количество. */
export interface VacancyScanPageProgress {
  currentPage: number | null;
  totalPages: number;
}

/** §3.7: сохранённая позиция прогона и ссылка на выдачу, при которой она была взята. */
export interface VacancyScanPositionSnapshot {
  source: VacancySource;
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
  /**
   * Источник, чья страница листается прямо сейчас, а после finish() — последней
   * обработанной ноги; null, если прогонов ещё не было. При ALL меняется на
   * каждой ноге (см. selection ниже — что было ЗАПРОШЕНО).
   */
  source: VacancySource | null;
  /** §4.11.0/§5.7: чем был запущен прогон — конкретный источник либо SCAN_SOURCE_ALL; живёт до следующего tryStart(), как и source. */
  selection: ScanSourceSelection | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  progress: VacancyScanProgress;
  pageProgress: VacancyScanPageProgress;
  stopRequested: boolean;
  /** §4.11.9: true, пока прогон грузит модель перед первой страницей выдачи; вне RUNNING всегда false. */
  aiWarmingUp: boolean;
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
  item: VacancySearchItem;
  source: VacancySource;
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
  item: VacancySearchItem;
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

/** §4.11.4: итог этапа 2 — вердикт ИИ по названию, всегда matchSource === MATCH_SOURCE.AI. */
export interface VacancyTitleDecision {
  item: VacancySearchItem;
  dedupKey: VacancyLeadDedupKey;
  matches: boolean;
  matchedKeywords: string[];
  aiTitleReason: string | null;
}

/**
 * §4.11.4 этап 2: итог обработки одного батча/страницы названий — решения,
 * собранные из чанков, что успели ответить, и причина остановки (AI_UNAVAILABLE),
 * если недоступность модели прервала этап, либо null, если все чанки отработали.
 */
export interface VacancyTitleStageResult {
  decisions: VacancyTitleDecision[];
  stop: ScanStoppedReason | null;
}

/**
 * Счётчик открытых страниц вакансий (§4.11.8, VACANCY_SCAN_MAX_DETAILS), общий на весь
 * прогон (несколько страниц выдачи) — объект, а не примитив, чтобы processPage мог
 * инкрементировать его по ссылке без возврата значения наружу.
 */
export interface VacancyScanDetailsBudget {
  opened: number;
}

/**
 * §4.11.4/§4.11.8: итог синхронного планирующего прохода по одной странице выдачи
 * (planPageWork, vacancy-scan.service.ts) — кандидаты, под которых бюджет
 * MAX_DETAILS уже зарезервирован, и причина, на которой планирование прервалось,
 * либо null, если дошло до конца списка.
 */
export interface VacancyScanPagePlan {
  detailTasks: VacancyTitleDecision[];
  stop: ScanStoppedReason | null;
}

/**
 * §4.11.0: одна нога мультипрогона — источник со своим провайдером, своим
 * шаблоном ссылки на выдачу (из снимка настроек) и своей стартовой страницей
 * (0 на FRESH, сохранённая позиция на RESUME). Собирает VacancyScanService.buildPlan().
 */
export interface VacancyScanSourcePlan {
  source: VacancyLeadSearchSource;
  provider: VacancyLeadSearchProvider;
  searchUrlTemplate: string;
  startPage: number;
}

/** §4.11.0/§4.11.11: итог одной ноги мультипрогона — причина её остановки и сообщение (VacancyScanService.runSource()). */
export interface VacancyScanLegResult {
  reason: ScanStoppedReason;
  message: string | null;
}
