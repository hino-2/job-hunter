/**
 * Локальное состояние формы «Настройки поиска» (§7.9.4). Ключевые слова и стоп-слова
 * редактируются как текст через запятую (Chip-редактор намеренно не заводим), поэтому
 * форма хранит их иначе, чем VacancySearchSettings хранит массивы.
 */
export interface SearchSettingsFormValues {
  keywordsText: string;
  excludeKeywordsText: string;
  titlePrompt: string;
  descriptionPrompt: string;
  aiEnabled: boolean;
  searchUrlTemplate: string;
  itVacanciesSearchUrlTemplate: string;
}
