import { parseKeywordList } from '../vacancy-keywords.helpers';
import type { VacancySearchSettings } from '../vacancy-search-settings.entity';

/**
 * Ответ GET/PUT /api/vacancy-search-settings (§5.7). searchUrlTemplate передаётся
 * отдельным аргументом, а не читается из entity — это значение env
 * (VacancySearchSettingsService.searchUrlTemplate), а не колонка БД.
 */
export class VacancySearchSettingsDto {
  searchText!: string;
  keywords!: string[];
  excludeKeywords!: string[];
  titlePrompt!: string;
  descriptionPrompt!: string;
  aiEnabled!: boolean;
  /** §5.7: только на чтение — нужен фронту для предпросмотра итогового URL (§7.9.4). */
  searchUrlTemplate!: string;
  updatedAt!: string;

  static fromEntity(entity: VacancySearchSettings, searchUrlTemplate: string): VacancySearchSettingsDto {
    const dto = new VacancySearchSettingsDto();

    dto.searchText = entity.searchText;
    dto.keywords = parseKeywordList(entity.keywords);
    dto.excludeKeywords = parseKeywordList(entity.excludeKeywords);
    dto.titlePrompt = entity.titlePrompt;
    dto.descriptionPrompt = entity.descriptionPrompt;
    dto.aiEnabled = entity.aiEnabled;
    dto.searchUrlTemplate = searchUrlTemplate;
    dto.updatedAt = entity.updatedAt.toISOString();

    return dto;
  }
}
