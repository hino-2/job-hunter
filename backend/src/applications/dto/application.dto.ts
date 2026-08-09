import type { Application } from '../application.entity';
import type { ApplicationResponse } from '../applications.interfaces';
import type {
  ApplicationResult,
  ApplicationStatus,
  SyncOutcome,
  VacancySource,
} from '../applications.type';

function toIsoOrNull(value: Date | null): string | null {
  if (value === null) {
    return null;
  }

  return value.toISOString();
}

/**
 * Ответное представление записи. Единственное место, где формируется внешний
 * JSON-контракт (§5): camelCase-поля и даты как ISO 8601 с Z.
 *
 * Маппинг написан руками, поле за полем, вместо plainToInstance — так контракт
 * виден целиком, а добавление колонки в сущность не протекает в API само собой.
 */
export class ApplicationDto implements ApplicationResponse {
  id!: string;
  company!: string;
  position!: string | null;
  vacancyUrl!: string | null;
  resumeUrl!: string | null;
  interviewUrl!: string | null;
  status!: ApplicationStatus;
  result!: ApplicationResult;
  employerContact!: string | null;
  hrInterviewAt!: string | null;
  techInterviewAt!: string | null;
  notes!: string | null;
  vacancySource!: VacancySource | null;
  vacancyExternalId!: string | null;
  vacancyArchived!: boolean | null;
  lastSyncedAt!: string | null;
  lastSyncOutcome!: SyncOutcome | null;
  lastSyncError!: string | null;
  createdAt!: string;
  updatedAt!: string;

  static fromEntity(entity: Application): ApplicationDto {
    const dto = new ApplicationDto();

    dto.id = entity.id;
    dto.company = entity.company;
    dto.position = entity.position;
    dto.vacancyUrl = entity.vacancyUrl;
    dto.resumeUrl = entity.resumeUrl;
    dto.interviewUrl = entity.interviewUrl;
    dto.status = entity.status;
    dto.result = entity.result;
    dto.employerContact = entity.employerContact;
    dto.hrInterviewAt = toIsoOrNull(entity.hrInterviewAt);
    dto.techInterviewAt = toIsoOrNull(entity.techInterviewAt);
    dto.notes = entity.notes;
    dto.vacancySource = entity.vacancySource;
    dto.vacancyExternalId = entity.vacancyExternalId;
    dto.vacancyArchived = entity.vacancyArchived;
    dto.lastSyncedAt = toIsoOrNull(entity.lastSyncedAt);
    dto.lastSyncOutcome = entity.lastSyncOutcome;
    dto.lastSyncError = entity.lastSyncError;
    dto.createdAt = entity.createdAt.toISOString();
    dto.updatedAt = entity.updatedAt.toISOString();

    return dto;
  }
}
