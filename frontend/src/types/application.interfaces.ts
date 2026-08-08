import type {
  ApplicationOrder,
  ApplicationResult,
  ApplicationSortField,
  ApplicationStatus,
  StatusFilter,
  SyncOutcome,
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
  status: ApplicationStatus;
  result: ApplicationResult;
  employerContact: string | null;
  hrInterviewAt: string | null;
  techInterviewAt: string | null;
  notes: string | null;
  hhVacancyId: string | null;
  hhArchived: boolean | null;
  hhVacancyType: string | null;
  lastSyncedAt: string | null;
  lastSyncOutcome: SyncOutcome | null;
  lastSyncError: string | null;
  createdAt: string;
  updatedAt: string;
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

/** Ближайшее будущее собеседование для свёрнутой шапки (§7.2.1, элемент 5). */
export interface UpcomingInterview {
  at: string;
  isSoon: boolean;
}
