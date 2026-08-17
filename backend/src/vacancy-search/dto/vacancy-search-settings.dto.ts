import { parseKeywordList } from '../vacancy-keywords.helpers';
import type { VacancySearchSettings } from '../vacancy-search-settings.entity';

/** Ответ GET/PUT /api/vacancy-search-settings (§5.7). */
export class VacancySearchSettingsDto {
  keywords!: string[];
  excludeKeywords!: string[];
  titlePrompt!: string;
  descriptionPrompt!: string;
  aiEnabled!: boolean;
  /** §3.6/§4.11.1: обычное поле настроек — читается из entity, а не из env (§5.7). */
  searchUrlTemplate!: string;
  updatedAt!: string;

  static fromEntity(entity: VacancySearchSettings): VacancySearchSettingsDto {
    const dto = new VacancySearchSettingsDto();

    dto.keywords = parseKeywordList(entity.keywords);
    dto.excludeKeywords = parseKeywordList(entity.excludeKeywords);
    dto.titlePrompt = entity.titlePrompt;
    dto.descriptionPrompt = entity.descriptionPrompt;
    dto.aiEnabled = entity.aiEnabled;
    dto.searchUrlTemplate = entity.searchUrlTemplate;
    dto.updatedAt = entity.updatedAt.toISOString();

    return dto;
  }
}
