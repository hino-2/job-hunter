/**
 * Поля формы настроек, для которых бэкенд шлёт сообщение вида "поле: текст" (§5.7,
 * UpdateVacancySearchSettingsDto) — у titlePrompt/descriptionPrompt и обоих шаблонов
 * ссылок есть кастомные @Matches/@Validate-сообщения с таким префиксом, остальные поля
 * клиент уже проверяет сам (§10). Проверка хоста шаблона (SearchUrlTemplateConstraint
 * и её it-vacancies-близнец) существует только на сервере — клиент её не дублирует
 * (§7.9.4), поэтому оба поля обязаны быть в списке.
 */
export const SEARCH_SETTINGS_SERVER_VALIDATED_FIELDS = [
  'searchUrlTemplate',
  'itVacanciesSearchUrlTemplate',
  'titlePrompt',
  'descriptionPrompt',
] as const;
