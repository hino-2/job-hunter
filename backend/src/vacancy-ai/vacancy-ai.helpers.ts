import {
  VACANCY_AI_TITLE_LINE_DIVIDER,
  VACANCY_AI_TITLES_LINE_SEPARATOR,
} from './vacancy-ai.constants';
import type { AiTitleBatchItem } from './vacancy-ai.interfaces';

/**
 * Рендер промпта и форматирование батча названий (§4.12.2). Чистые функции без
 * зависимостей — переиспользуются VacancyAiService для обоих этапов конвейера.
 */

/** Подстановка плейсхолдеров вида {placeholder} → значение; порядок ключей неважен. */
export function renderPrompt(template: string, values: Readonly<Record<string, string>>): string {
  return Object.entries(values).reduce(
    (text, [placeholder, value]) => text.replaceAll(placeholder, value),
    template,
  );
}

/**
 * §4.12.2: «N. <название> — <компания>», нумерация с 1. Компания включена в строку
 * батча, а не вынесена отдельным плейсхолдером {company} — в отличие от промпта
 * описания, у батча названий компания своя на каждую строку, единого значения нет.
 */
export function formatTitlesBlock(items: readonly AiTitleBatchItem[]): string {
  return items
    .map((item, index) => `${index + 1}. ${item.title}${VACANCY_AI_TITLE_LINE_DIVIDER}${item.company}`)
    .join(VACANCY_AI_TITLES_LINE_SEPARATOR);
}
