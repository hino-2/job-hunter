import { LIKE_ESCAPE_PATTERN, LIKE_ESCAPE_REPLACEMENT, LIKE_WILDCARD } from './common.constants';

/**
 * Экранирует метасимволы LIKE/ILIKE и оборачивает терм в проценты для поиска
 * подстроки. Переезд приватной buildSearchPattern из applications.service.ts:
 * общий хелпер, потому что поиск по подстроке нужен не только откликам (§5.1), но
 * и будущему списку вакансий (`search` по position/company, §5.7) — копия в каждом
 * модуле разошлась бы с оригиналом при первой же правке экранирования.
 */
export function buildLikePattern(term: string): string {
  const escaped = term.replace(LIKE_ESCAPE_PATTERN, LIKE_ESCAPE_REPLACEMENT);

  return `${LIKE_WILDCARD}${escaped}${LIKE_WILDCARD}`;
}
