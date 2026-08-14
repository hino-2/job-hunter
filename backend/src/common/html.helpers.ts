import {
  HTML_ANY_TAG_PATTERN,
  HTML_BLANK_LINE_RUN_PATTERN,
  HTML_BLOCK_BREAK_TAG_PATTERN,
  HTML_ENTITY_REPLACEMENTS,
  HTML_INLINE_WHITESPACE_PATTERN,
} from './common.constants';

/**
 * §4.11.3/§4.11.7: снятие HTML-экранирования — общее для разбора встроенного JSON
 * состояния выдачи hh.ru (hh-search.parser.ts) и приведения описания вакансии
 * к plain text перед отправкой модели (ниже). &amp; заменяется ПОСЛЕДНИМ
 * (см. комментарий к HTML_ENTITY_REPLACEMENTS) — иначе &amp;quot; станет кавычкой
 * раньше срока.
 */
export function unescapeHtmlEntities(value: string): string {
  return HTML_ENTITY_REPLACEMENTS.reduce(
    (text, [pattern, replacement]) => text.replace(pattern, replacement),
    value,
  );
}

/**
 * §4.11.7: HTML описания вакансии → plain text для модели. Не санитайзер — строка
 * никогда не рендерится как HTML, только уходит в промпт (§4.12), поэтому
 * cheerio/jsdom не нужны (§2.4 п.7), тот же принцип, что у разбора страниц вакансий.
 *
 * Порядок: <li>/<p>/<br> → перевод строки (иначе после вырезки тегов слова из
 * соседних пунктов списка склеятся без пробела), остальные теги вырезаются целиком,
 * сущности раскрываются, затем построчно схлопываются внутристрочные пробельные
 * серии и убегающие пустые строки. Обрезка по VACANCY_AI_DESCRIPTION_MAX_CHARS —
 * не здесь, это забота vacancy-ai/ (§4.11.7): у этого хелпера нет доступа к настройкам.
 */
export function htmlToPlainText(html: string): string {
  const withLineBreaks = html.replace(HTML_BLOCK_BREAK_TAG_PATTERN, '\n');
  const withoutTags = withLineBreaks.replace(HTML_ANY_TAG_PATTERN, '');
  const unescaped = unescapeHtmlEntities(withoutTags);

  const collapsedLines = unescaped
    .split('\n')
    .map((line) => line.replace(HTML_INLINE_WHITESPACE_PATTERN, ' ').trim())
    .join('\n');

  return collapsedLines.replace(HTML_BLANK_LINE_RUN_PATTERN, '\n').trim();
}
