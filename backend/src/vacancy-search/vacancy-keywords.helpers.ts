import {
  KEYWORD_LIST_SEPARATOR,
  NORMALIZE_WHITESPACE_PATTERN,
  NORMALIZE_YO_PATTERN,
  NORMALIZE_YO_REPLACEMENT,
} from './vacancy-search.constants';
import type { VacancyMatchMode } from './vacancy-search.type';

/**
 * §4.11.4: нормализация и сравнение ключевых/стоп-слов. Общие для этапа 0
 * (стоп-слова, всегда) и детерминированного отбора без ИИ (VACANCY_MATCH_MODE).
 * Чистые функции без зависимостей — переиспользуются и конвейером поиска (шаг B6),
 * и, потенциально, любым будущим местом, которому нужно то же правило.
 */

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** trim, нижний регистр, ё → е, схлопывание пробельных серий (§4.11.4). */
export function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(NORMALIZE_YO_PATTERN, NORMALIZE_YO_REPLACEMENT)
    .replace(NORMALIZE_WHITESPACE_PATTERN, ' ');
}

/** §3.6: keywords/exclude_keywords хранятся строкой через запятую → массив. */
export function parseKeywordList(raw: string | null): string[] {
  if (raw === null) {
    return [];
  }

  return raw
    .split(KEYWORD_LIST_SEPARATOR)
    .map((keyword) => keyword.trim())
    .filter((keyword) => keyword.length > 0);
}

/**
 * §4.11.4: сравнение по границам слов, а не подстрокой — «go» внутри «Django»
 * не должно матчиться, а равенство целиком не сработает никогда (заголовки
 * состоят из пяти-шести токенов). Фразы с пробелом/дефисом («full stack»,
 * «full-stack») матчатся как есть — внутренний пробел не мешает границе на краях.
 *
 * Штатный \b в JS-регексах не годится для кириллицы: \w не включает кириллические
 * буквы, поэтому «1С» или «стажёр» (дефолтные стоп-слова, §4.11.4) матчились бы
 * неверно. Границы построены на \p{L}/\p{N} через lookahead/lookbehind — это
 * покрывает и латиницу, и кириллицу одинаково.
 */
function buildKeywordBoundaryPattern(normalizedKeyword: string): RegExp {
  const escaped = escapeRegExp(normalizedKeyword);

  return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'u');
}

/** Подмножество keywords, совпавшее с text по границам слов (после нормализации). */
export function matchKeywords(text: string, keywords: readonly string[]): string[] {
  const normalizedText = normalizeText(text);

  return keywords.filter((keyword) => {
    const normalizedKeyword = normalizeText(keyword);

    return (
      normalizedKeyword.length > 0 && buildKeywordBoundaryPattern(normalizedKeyword).test(normalizedText)
    );
  });
}

/** §4.11.4 этап 0: совпадение любого стоп-слова отбрасывает вакансию до всякого ИИ. */
export function hasExcluded(text: string, excludeKeywords: readonly string[]): boolean {
  return matchKeywords(text, excludeKeywords).length > 0;
}

/**
 * §4.11.4: решает, засчитан ли отбор по совпавшим ключевым словам. `any` —
 * достаточно одного совпадения; `all` требует совпадения всех проверяемых слов,
 * поэтому вызывающий обязан передать исходную длину списка keywords — matchKeywords
 * возвращает лишь совпавшее подмножество, а не пары «слово → совпало ли».
 */
export function isKeywordMatch(
  matched: readonly string[],
  keywordsTotal: number,
  mode: VacancyMatchMode,
): boolean {
  if (mode === 'all') {
    return keywordsTotal > 0 && matched.length === keywordsTotal;
  }

  return matched.length > 0;
}
