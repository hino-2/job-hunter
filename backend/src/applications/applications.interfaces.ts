import type { ApplicationResult, ApplicationStatus, SyncOutcome } from './applications.type';

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
  status: ApplicationStatus;
  result: ApplicationResult;
  employerContact: string | null;
  hrInterviewAt: Date | null;
  techInterviewAt: Date | null;
  notes: string | null;
}

/**
 * Поля, которые бэкенд вычисляет сам и которые пользователь прислать не может (§4.2):
 * hh_vacancy_id выводится из vacancy_url при каждой его записи.
 *
 * Вынесены отдельно от ApplicationWritableFields, чтобы в DTO ничего подобного не
 * появилось по недосмотру: whitelist ValidationPipe отбивает такие поля в 400.
 */
export interface ApplicationDerivedFields {
  hhVacancyId: string | null;
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
