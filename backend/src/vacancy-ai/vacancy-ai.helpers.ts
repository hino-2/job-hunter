import {
  VACANCY_AI_EVIDENCE_MIN_NORMALIZED_LENGTH,
  VACANCY_AI_EVIDENCE_NORMALIZATION_REPLACEMENTS,
  VACANCY_AI_TITLE_LINE_DIVIDER,
  VACANCY_AI_TITLE_OUTPUT_TOKENS_OVERHEAD,
  VACANCY_AI_TITLE_OUTPUT_TOKENS_PER_ITEM,
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
    .map(
      (item, index) => `${index + 1}. ${item.title}${VACANCY_AI_TITLE_LINE_DIVIDER}${item.company}`,
    )
    .join(VACANCY_AI_TITLES_LINE_SEPARATOR);
}

/**
 * §4.12.3: приводит текст к виду, пригодному для сравнения подстрокой — применяется
 * ОДИНАКОВО к цитате модели и к описанию (isEvidenceGrounded), поэтому различие
 * кавычек/тире/ё между ними не превращается в ложное «цитата не найдена».
 */
export function normalizeForEvidenceMatch(value: string): string {
  const normalized = VACANCY_AI_EVIDENCE_NORMALIZATION_REPLACEMENTS.reduce(
    (text, [pattern, replacement]) => text.replace(pattern, replacement),
    value,
  );

  return normalized.trim().toLowerCase();
}

/**
 * §4.12.3: только нормализованное вхождение подстрокой — никакого fuzzy/similarity
 * сравнения. description здесь — тот же обрезанный (clampText) текст, что реально
 * ушёл модели в промпте, иначе проверка была бы не о том, что модель видела.
 * Регулярки таблицы замен используются исключительно через String.replace, а не
 * .test()/.exec(), поэтому проблемы lastIndex у /g-паттернов здесь не возникает.
 */
export function isEvidenceGrounded(evidence: string, description: string): boolean {
  const normalizedEvidence = normalizeForEvidenceMatch(evidence);

  if (normalizedEvidence.length < VACANCY_AI_EVIDENCE_MIN_NORMALIZED_LENGTH) {
    return false;
  }

  return normalizeForEvidenceMatch(description).includes(normalizedEvidence);
}

/**
 * §4.12.3: потолок генерации этапа 1 растёт вместе с батчем — иначе большой батч
 * (VACANCY_AI_BATCH_SIZE до VACANCY_AI_BATCH_SIZE_MAX = 30, §8) обрезался бы тем же
 * фиксированным потолком, что и батч из одного названия, и вердикты для хвоста батча
 * ушли бы в фолбэк по ключевым словам ещё до всякого сбоя модели.
 */
export function resolveTitleMaxOutputTokens(itemCount: number): number {
  return (
    VACANCY_AI_TITLE_OUTPUT_TOKENS_OVERHEAD + VACANCY_AI_TITLE_OUTPUT_TOKENS_PER_ITEM * itemCount
  );
}
