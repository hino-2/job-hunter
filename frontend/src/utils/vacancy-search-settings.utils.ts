import {
  KEYWORD_LIST_JOIN_SEPARATOR,
  KEYWORD_LIST_SEPARATOR,
  SEARCH_URL_PAGE_PLACEHOLDER,
  SEARCH_URL_PREVIEW_PAGE,
  SEARCH_URL_TEMPLATE_HTTPS_PREFIX,
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
 * содержит буквальные подстроки `{text}` и `{page}`, которые заменяются введённым
 * searchText и страницей 0 — блок подписан «Первая страница поиска», значит должен
 * показывать ровно ту страницу, которую собрал бы buildHhSearchUrl на старте прогона.
 * encodeURIComponent — тем же способом, каким бэкенд строит запрос к hh.ru.
 */
export function buildSearchUrlPreview(searchUrlTemplate: string, searchText: string): string {
  return searchUrlTemplate
    .replace(SEARCH_URL_TEMPLATE_PLACEHOLDER, encodeURIComponent(searchText))
    .replace(SEARCH_URL_PAGE_PLACEHOLDER, SEARCH_URL_PREVIEW_PAGE);
}

/** Есть ли в тексте промпта все обязательные плейсхолдеры — до отправки на сервер (§10). */
export function hasAllPlaceholders(text: string, patterns: readonly RegExp[]): boolean {
  return patterns.every((pattern) => pattern.test(text));
}

/**
 * §7.9.4: происхождение шаблона ссылки (https:// + абсолютный URL) — до отправки на
 * сервер. Allow-list хостов hh.ru здесь намеренно не проверяется: клиентская проверка
 * обязана быть мягче серверной (SearchUrlTemplateConstraint, §5.7), иначе отказ по
 * хосту пришёл бы серверной ошибкой поля лишь один раз, а кнопка «Сохранить» после
 * этого осталась бы навсегда заблокированной клиентской копией той же проверки.
 */
export function isValidSearchUrlTemplateShape(template: string): boolean {
  try {
    const url = new URL(template);

    return url.protocol === SEARCH_URL_TEMPLATE_HTTPS_PREFIX;
  } catch {
    return false;
  }
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
    searchUrlTemplate: settings.searchUrlTemplate,
  };
}

/** Значения формы → тело PUT (§5.7). searchText/searchUrlTemplate триммятся, как и на бэкенде (@TrimText). */
export function buildSettingsUpdatePayload(values: SearchSettingsFormValues): VacancySearchSettingsUpdate {
  return {
    searchText: values.searchText.trim(),
    keywords: parseKeywordsInput(values.keywordsText),
    excludeKeywords: parseKeywordsInput(values.excludeKeywordsText),
    titlePrompt: values.titlePrompt,
    descriptionPrompt: values.descriptionPrompt,
    aiEnabled: values.aiEnabled,
    searchUrlTemplate: values.searchUrlTemplate.trim(),
  };
}
