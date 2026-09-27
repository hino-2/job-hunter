import type { CompanyCareerSite } from '../company-career-site.entity';

/**
 * Ответное представление строки company_career_sites (§5.9). Маппинг написан руками,
 * поле за полем — тот же приём, что у ApplicationDto: контракт виден целиком, а
 * добавление колонки в сущность не протекает в API само собой.
 */
export class CompanyCareerSiteDto {
  id!: string;
  name!: string;
  url!: string;
  /** §5.9: CompanySiteParserRegistry.resolve(url) !== null — вычисляется контроллером. */
  parserSupported!: boolean;
  createdAt!: string;
  updatedAt!: string;

  static fromEntity(entity: CompanyCareerSite, parserSupported: boolean): CompanyCareerSiteDto {
    const dto = new CompanyCareerSiteDto();

    dto.id = entity.id;
    dto.name = entity.name;
    dto.url = entity.url;
    dto.parserSupported = parserSupported;
    dto.createdAt = entity.createdAt.toISOString();
    dto.updatedAt = entity.updatedAt.toISOString();

    return dto;
  }
}
