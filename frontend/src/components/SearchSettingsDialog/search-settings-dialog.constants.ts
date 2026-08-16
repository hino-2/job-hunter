/**
 * Поля формы настроек, для которых бэкенд шлёт сообщение вида "поле: текст" (§5.7,
 * UpdateVacancySearchSettingsDto) — у titlePrompt/descriptionPrompt/searchUrlTemplate
 * есть кастомные @Matches/@Validate-сообщения с таким префиксом, остальные поля клиент
 * уже проверяет сам (§10). Проверка хоста шаблона (SearchUrlTemplateConstraint)
 * существует только на сервере — клиент её не дублирует (§7.9.4).
 */
export const SEARCH_SETTINGS_SERVER_VALIDATED_FIELDS = [
  'searchUrlTemplate',
  'titlePrompt',
  'descriptionPrompt',
] as const;
