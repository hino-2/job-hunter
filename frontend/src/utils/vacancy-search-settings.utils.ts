import {
  KEYWORD_LIST_JOIN_SEPARATOR,
  KEYWORD_LIST_SEPARATOR,
  SEARCH_URL_TEMPLATE_PLACEHOLDER,
} from '../constants/vacancy-search.constants';
import type { SearchSettingsFormValues } from '../types/vacancy-search-settings-form.interfaces';
import type {
  VacancySearchSettings,
  VacancySearchSettingsUpdate,
} from '../types/vacancy-search.interfaces';

/**
 * Разбор/сборка полей формы настроек поиска (§7.9.4). Chip-редактор намеренно не заводим
 * (§7.9.4): строка через запятую редактируется быстрее и переносится копипастом.
 */

/** Текстовое поле «через запятую» → массив тела PUT (§3.6, §5.7). Пустые элементы отсеиваются. */
export function parseKeywordsInput(text: string): string[] {
  return text
    .split(KEYWORD_LIST_SEPARATOR)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

/** Массив настроек → текст поля ввода, тем же разделителем, что хранится в БД (§3.6). */
export function formatKeywordsInput(keywords: readonly string[]): string {
  return keywords.join(KEYWORD_LIST_JOIN_SEPARATOR);
}

/**
 * Предпросмотр итогового URL первой страницы (§4.11.1, §7.9.4): searchUrlTemplate
 * приходит из GET и содержит буквальную подстроку `{text}`, которую заменяет введённый
 * searchText. encodeURIComponent — тем же способом, каким бэкенд строит запрос к hh.ru.
 */
export function buildSearchUrlPreview(searchUrlTemplate: string, searchText: string): string {
  return searchUrlTemplate.replace(SEARCH_URL_TEMPLATE_PLACEHOLDER, encodeURIComponent(searchText));
}

/** Есть ли в тексте промпта все обязательные плейсхолдеры — до отправки на сервер (§10). */
export function hasAllPlaceholders(text: string, patterns: readonly RegExp[]): boolean {
  return patterns.every((pattern) => pattern.test(text));
}

/** Ресурс с сервера → локальные значения формы (§7.9.4), при первом монтаже диалога. */
export function buildSettingsFormValues(settings: VacancySearchSettings): SearchSettingsFormValues {
  return {
    searchText: settings.searchText,
    keywordsText: formatKeywordsInput(settings.keywords),
    excludeKeywordsText: formatKeywordsInput(settings.excludeKeywords),
    titlePrompt: settings.titlePrompt,
    descriptionPrompt: settings.descriptionPrompt,
    aiEnabled: settings.aiEnabled,
  };
}

/** Значения формы → тело PUT (§5.7). searchText триммится, как и на бэкенде (@TrimText). */
export function buildSettingsUpdatePayload(values: SearchSettingsFormValues): VacancySearchSettingsUpdate {
  return {
    searchText: values.searchText.trim(),
    keywords: parseKeywordsInput(values.keywordsText),
    excludeKeywords: parseKeywordsInput(values.excludeKeywordsText),
    titlePrompt: values.titlePrompt,
    descriptionPrompt: values.descriptionPrompt,
    aiEnabled: values.aiEnabled,
  };
}
