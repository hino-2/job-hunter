import type { VacancySource } from '../../applications/applications.type';
import { parseKeywordList } from '../vacancy-keywords.helpers';
import type { VacancyLead } from '../vacancy-lead.entity';
import type { MatchSource } from '../vacancy-search.type';

function toIsoOrNull(value: Date | null): string | null {
  return value === null ? null : value.toISOString();
}

/**
 * Ответное представление лида (§5.7): camelCase-поля, matchedKeywords/workFormats —
 * массивами (parseKeywordList переиспользован из vacancy-keywords.helpers.ts: оба
 * поля хранятся строкой через ту же запятую, что и keywords/exclude_keywords),
 * hidden — булево вместо hiddenAt (фронту нужен признак, а не момент времени).
 * Описания в DTO нет по определению (§3.5, §4.11.7).
 */
export class VacancyLeadDto {
  id!: string;
  source!: VacancySource;
  externalId!: string;
  position!: string;
  company!: string;
  hasCompanyLogo!: boolean;
  vacancyUrl!: string;
  publishedAt!: string | null;
  publishedOn!: string;
  areaName!: string | null;
  salaryFrom!: number | null;
  salaryTo!: number | null;
  salaryCurrency!: string | null;
  salaryGross!: boolean | null;
  experience!: string | null;
  employmentForm!: string | null;
  workFormats!: string[] | null;
  matchedKeywords!: string[] | null;
  matchSource!: MatchSource;
  aiModel!: string | null;
  aiTitleReason!: string | null;
  aiDescriptionReason!: string | null;
  hidden!: boolean;
  firstSeenAt!: string;
  lastSeenAt!: string;

  static fromEntity(entity: VacancyLead): VacancyLeadDto {
    const dto = new VacancyLeadDto();

    dto.id = entity.id;
    dto.source = entity.source;
    dto.externalId = entity.externalId;
    dto.position = entity.position;
    dto.company = entity.company;
    // Имя файла наружу не уходит — только признак наличия (§4.10, шаг №26 §14).
    dto.hasCompanyLogo = entity.companyLogoFile !== null;
    dto.vacancyUrl = entity.vacancyUrl;
    dto.publishedAt = toIsoOrNull(entity.publishedAt);
    dto.publishedOn = entity.publishedOn;
    dto.areaName = entity.areaName;
    dto.salaryFrom = entity.salaryFrom;
    dto.salaryTo = entity.salaryTo;
    dto.salaryCurrency = entity.salaryCurrency;
    dto.salaryGross = entity.salaryGross;
    dto.experience = entity.experience;
    dto.employmentForm = entity.employmentForm;
    dto.workFormats = entity.workFormats !== null ? parseKeywordList(entity.workFormats) : null;
    dto.matchedKeywords = entity.matchedKeywords !== null ? parseKeywordList(entity.matchedKeywords) : null;
    dto.matchSource = entity.matchSource;
    dto.aiModel = entity.aiModel;
    dto.aiTitleReason = entity.aiTitleReason;
    dto.aiDescriptionReason = entity.aiDescriptionReason;
    dto.hidden = entity.hiddenAt !== null;
    dto.firstSeenAt = entity.firstSeenAt.toISOString();
    dto.lastSeenAt = entity.lastSeenAt.toISOString();

    return dto;
  }
}
