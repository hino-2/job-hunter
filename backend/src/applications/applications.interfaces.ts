import type { Application } from './application.entity';
import type {
  ApplicationResult,
  ApplicationStatus,
  SyncOutcome,
  SyncOutcomeCounts,
  VacancySource,
} from './applications.type';

/**
 * Поля записи, которыми владеет пользователь (§5.1). Типы — как в сущности,
 * то есть даты уже `Date`. hh-/sync-поля сюда не входят: их пишет только
 * синхронизация, а не запросы пользователя.
 */
export interface ApplicationWritableFields {
  company: string;
  position: string | null;
  vacancyUrl: string | null;
  resumeUrl: string | null;
  interviewUrl: string | null;
  status: ApplicationStatus;
  result: ApplicationResult;
  employerContact: string | null;
  hrInterviewAt: Date | null;
  techInterviewAt: Date | null;
  notes: string | null;
}

/**
 * Вход чистой функции deriveInterviewStatus (§3.2): статус выводится из дат собеседований,
 * но эффективный status на входе (уже с учётом терминального result/явного CLOSED в теле
 * запроса) решает, можно ли его вообще перебивать.
 */
export interface InterviewStatusInput {
  hrInterviewAt: Date | null;
  techInterviewAt: Date | null;
  status: ApplicationStatus;
}

/**
 * Поля, которые бэкенд вычисляет сам и которые пользователь прислать не может (§4.2):
 * источник и внешний ID выводятся из vacancy_url при каждой его записи.
 *
 * Вынесены отдельно от ApplicationWritableFields, чтобы в DTO ничего подобного не
 * появилось по недосмотру: whitelist ValidationPipe отбивает такие поля в 400.
 */
export interface ApplicationDerivedFields {
  vacancySource: VacancySource | null;
  vacancyExternalId: string | null;
}

/**
 * Внешний JSON-контракт записи (§5): camelCase, даты — строки ISO 8601 с Z.
 * Реализуется ApplicationDto; e2e-тесты типизируют им response.body.
 */
export interface ApplicationResponse {
  id: string;
  company: string;
  position: string | null;
  vacancyUrl: string | null;
  resumeUrl: string | null;
  interviewUrl: string | null;
  status: ApplicationStatus;
  result: ApplicationResult;
  employerContact: string | null;
  hrInterviewAt: string | null;
  techInterviewAt: string | null;
  notes: string | null;
  vacancySource: VacancySource | null;
  vacancyExternalId: string | null;
  vacancyArchived: boolean | null;
  /** §4.10: наружу уходит только признак наличия — имя файла остаётся деталью хранилища. */
  hasCompanyLogo: boolean;
  lastSyncedAt: string | null;
  lastSyncOutcome: SyncOutcome | null;
  lastSyncError: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Колонки, которыми синхронизация вправе управлять (§4.3 п.5, новая редакция):
 * position теперь принадлежит ей наравне со status/vacancyArchived/last_sync_*,
 * потому что при OK заголовок вакансии перезаписывает ручную правку пользователя.
 * company и result по-прежнему принадлежат только пользователю и сюда не входят.
 */
export interface ApplicationSyncFields {
  position: string | null;
  status: ApplicationStatus;
  vacancyArchived: boolean | null;
  /** §4.10: колонка принадлежит синхронизации — имя файла логотипа на диске либо null. */
  companyLogoFile: string | null;
  lastSyncedAt: Date | null;
  lastSyncOutcome: SyncOutcome;
  lastSyncError: string | null;
}

/** Результат синхронизации одной записи: сущность в нём уже обновлена и сохранена. */
export interface ApplicationSyncResult {
  application: Application;
  outcome: SyncOutcome;
  /** null при OK; иначе текст, записанный в last_sync_error. */
  message: string | null;
  /** Запись перешла OPEN → CLOSED именно в этом прогоне (питает поле closed сводки, §5.2). */
  closed: boolean;
}

/** Итог массового прогона (§5.2). */
export interface ApplicationsSyncSummary {
  total: number;
  counts: SyncOutcomeCounts;
  closed: number;
  results: ApplicationSyncResult[];
}

/** Тело ответа POST /api/applications/:id/sync (§5.2). Реализуется SyncResultDto. */
export interface SyncResultResponse {
  outcome: SyncOutcome;
  message: string | null;
  application: ApplicationResponse;
}

/** Элемент items в сводке (§5.2). */
export interface SyncSummaryItemResponse {
  id: string;
  company: string;
  outcome: SyncOutcome;
  message: string | null;
}

/** Тело ответа POST /api/applications/sync-open (§5.2). Реализуется SyncSummaryDto. */
export interface SyncSummaryResponse {
  total: number;
  counts: SyncOutcomeCounts;
  closed: number;
  items: SyncSummaryItemResponse[];
  applications: ApplicationResponse[];
}
