import {
  KEYWORD_LIST_JOIN_SEPARATOR,
  KEYWORD_LIST_SEPARATOR,
  SEARCH_URL_TEMPLATE_HTTPS_PREFIX,
  SEARCH_URL_TEMPLATE_INVALID_MESSAGE,
  SEARCH_URL_TEMPLATE_MAX_LENGTH,
  SEARCH_URL_TEMPLATE_MISSING_PAGE_PLACEHOLDER_MESSAGE,
  SEARCH_URL_TEMPLATE_PAGE_PLACEHOLDER_PATTERN,
  SEARCH_URL_TEMPLATE_REQUIRED_MESSAGE,
  SEARCH_URL_TEMPLATE_TOO_LONG_MESSAGE,
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

/** Есть ли в тексте промпта все обязательные плейсхолдеры — до отправки на сервер (§10). */
export function hasAllPlaceholders(text: string, patterns: readonly RegExp[]): boolean {
  return patterns.every((pattern) => pattern.test(text));
}

/**
 * §7.9.4: происхождение шаблона ссылки (https:// + абсолютный URL) — до отправки на
 * сервер. Одна и та же функция обслуживает оба шаблона (hh.ru и it-vacancies.ru):
 * различаются они только allow-list'ом хостов, а его тут как раз и нет.
 * Allow-list хостов источника здесь намеренно не проверяется: клиентская проверка
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

/**
 * §7.9.4: клиентские правила поля со шаблоном ссылки — одной функцией на оба источника
 * (hh.ru и it-vacancies.ru), потому что правила у них дословно одни и те же
 * (UpdateVacancySearchSettingsDto, §5.7), и разъехаться копипастой они не должны.
 * `null` — значение отправлять можно; иначе готовое сообщение поля. Та же функция
 * решает и доступность «Сохранить»: заведомо невалидное на сервер не уходит (§10).
 * Длина считается по сырому значению (как maxLength поля), а пустота — по триммленному:
 * на сервер уходит именно триммленное (@TrimText).
 */
export function resolveSearchUrlTemplateIssue(template: string): string | null {
  if (template.trim().length === 0) {
    return SEARCH_URL_TEMPLATE_REQUIRED_MESSAGE;
  }

  if (template.length > SEARCH_URL_TEMPLATE_MAX_LENGTH) {
    return SEARCH_URL_TEMPLATE_TOO_LONG_MESSAGE;
  }

  if (!hasAllPlaceholders(template, [SEARCH_URL_TEMPLATE_PAGE_PLACEHOLDER_PATTERN])) {
    return SEARCH_URL_TEMPLATE_MISSING_PAGE_PLACEHOLDER_MESSAGE;
  }

  if (!isValidSearchUrlTemplateShape(template)) {
    return SEARCH_URL_TEMPLATE_INVALID_MESSAGE;
  }

  return null;
}

/** Ресурс с сервера → локальные значения формы (§7.9.4), при первом монтаже диалога. */
export function buildSettingsFormValues(settings: VacancySearchSettings): SearchSettingsFormValues {
  return {
    keywordsText: formatKeywordsInput(settings.keywords),
    excludeKeywordsText: formatKeywordsInput(settings.excludeKeywords),
    titlePrompt: settings.titlePrompt,
    descriptionPrompt: settings.descriptionPrompt,
    aiEnabled: settings.aiEnabled,
    searchUrlTemplate: settings.searchUrlTemplate,
    itVacanciesSearchUrlTemplate: settings.itVacanciesSearchUrlTemplate,
  };
}

/** Значения формы → тело PUT (§5.7). Оба шаблона ссылок триммятся, как и на бэкенде (@TrimText). */
export function buildSettingsUpdatePayload(
  values: SearchSettingsFormValues,
): VacancySearchSettingsUpdate {
  return {
    keywords: parseKeywordsInput(values.keywordsText),
    excludeKeywords: parseKeywordsInput(values.excludeKeywordsText),
    titlePrompt: values.titlePrompt,
    descriptionPrompt: values.descriptionPrompt,
    aiEnabled: values.aiEnabled,
    searchUrlTemplate: values.searchUrlTemplate.trim(),
    itVacanciesSearchUrlTemplate: values.itVacanciesSearchUrlTemplate.trim(),
  };
}
