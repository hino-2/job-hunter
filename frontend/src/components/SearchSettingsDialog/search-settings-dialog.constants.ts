/**
 * Поля формы настроек, для которых бэкенд шлёт сообщение вида "поле: текст" (§5.7,
 * UpdateVacancySearchSettingsDto) — у titlePrompt/descriptionPrompt и всех трёх шаблонов
 * ссылок есть кастомные @Matches/@Validate-сообщения с таким префиксом, остальные поля
 * клиент уже проверяет сам (§10). Проверка хоста шаблона (SearchUrlTemplateConstraint
 * и её it-vacancies/geekjob-близнецы) существует только на сервере — клиент её не
 * дублирует (§7.9.4), поэтому все три поля обязаны быть в списке.
 */
export const SEARCH_SETTINGS_SERVER_VALIDATED_FIELDS = [
  'searchUrlTemplate',
  'itVacanciesSearchUrlTemplate',
  'geekjobSearchUrlTemplate',
  'titlePrompt',
  'descriptionPrompt',
] as const;
