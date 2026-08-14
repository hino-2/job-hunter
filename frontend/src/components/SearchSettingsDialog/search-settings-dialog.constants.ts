/**
 * Поля формы настроек, для которых бэкенд шлёт сообщение вида "поле: текст" (§5.7,
 * UpdateVacancySearchSettingsDto) — только у titlePrompt/descriptionPrompt есть кастомные
 * @Matches-сообщения с таким префиксом, остальные поля клиент уже проверяет сам (§10).
 */
export const SEARCH_SETTINGS_SERVER_VALIDATED_FIELDS = ['titlePrompt', 'descriptionPrompt'] as const;
