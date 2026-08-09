import type {
  ApplicationOrder,
  ApplicationResult,
  ApplicationSortField,
  ApplicationStatus,
  StatusFilter,
  SyncOutcome,
  VacancySource,
} from './application.type';

/**
 * Запись отклика в том виде, в каком её отдаёт API (§5.1). Ручная копия
 * ApplicationResponse из backend/src/applications/applications.interfaces.ts:42 —
 * порядок и имена полей совпадают построчно, чтобы расхождение ловилось диффом.
 * Даты здесь строки ISO 8601, а не Date: JSON их не оживляет.
 */
export interface Application {
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
  lastSyncedAt: string | null;
  lastSyncOutcome: SyncOutcome | null;
  lastSyncError: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Тело PATCH /api/applications/:id (§5.1): все поля опциональны, отправляются только
 * изменённые (§7.3). Явный null очищает nullable-поле; company очистить нельзя, поэтому
 * её тип — string, а не string | null.
 *
 * Серверных полей (vacancySource, vacancyExternalId, lastSync*, createdAt, …) здесь нет
 * и быть не может:
 * ValidationPipe на бэкенде включён с forbidNonWhitelisted (§5.6) и ответил бы 400.
 */
export interface ApplicationUpdate {
  company?: string;
  position?: string | null;
  vacancyUrl?: string | null;
  resumeUrl?: string | null;
  interviewUrl?: string | null;
  status?: ApplicationStatus;
  result?: ApplicationResult;
  employerContact?: string | null;
  hrInterviewAt?: string | null;
  techInterviewAt?: string | null;
  notes?: string | null;
}

/** Состояние панели фильтров (§7.1). search хранится «как введено», без trim. */
export interface ApplicationsFilters {
  status: StatusFilter;
  search: string;
  sort: ApplicationSortField;
  order: ApplicationOrder;
}

/**
 * Query-параметры GET /api/applications (§5.1). status и search опциональны:
 * «Все» и пустой поиск не отправляются вовсе, иначе в кэше React Query заведётся
 * лишний ключ на каждое пустое значение.
 */
export interface ApplicationsQueryParams {
  status?: ApplicationStatus;
  search?: string;
  sort: ApplicationSortField;
  order: ApplicationOrder;
}

/** Счётчик шапки «Открытых: N / M» (§7.8). */
export interface ApplicationCounts {
  open: number;
  total: number;
}

/**
 * Тело POST /api/applications (§5.1). status здесь нет и не будет: §7.4 — новая запись
 * всегда создаётся открытой, это дефолт бэкенда. vacancySource/vacancyExternalId тоже
 * нет — их вычисляет бэкенд из vacancyUrl (§4.2), а forbidNonWhitelisted ответил бы 400
 * на попытку прислать.
 */
export interface ApplicationCreate {
  company: string;
  position?: string;
  vacancyUrl?: string;
  resumeUrl?: string;
  result?: ApplicationResult;
  employerContact?: string;
  hrInterviewAt?: string;
  techInterviewAt?: string;
  notes?: string;
}

/** Значения формы диалога создания (§7.4). Даты — Dayjs-совместимая ISO-строка или null. */
export interface CreateApplicationFormValues {
  vacancyUrl: string;
  company: string;
  position: string;
  resumeUrl: string;
  employerContact: string;
  hrInterviewAt: string | null;
  techInterviewAt: string | null;
  result: ApplicationResult;
  notes: string;
}

/** Ближайшее будущее собеседование для свёрнутой шапки (§7.2.1, элемент 5). */
export interface UpcomingInterview {
  at: string;
  isSoon: boolean;
}
