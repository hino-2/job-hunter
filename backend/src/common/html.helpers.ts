import {
  HTML_ANY_TAG_PATTERN,
  HTML_BLANK_LINE_RUN_PATTERN,
  HTML_BLOCK_BREAK_TAG_PATTERN,
  HTML_DIV_CLOSE_TOKEN_PREFIX,
  HTML_DIV_TOKEN_PATTERN,
  HTML_ENTITY_REPLACEMENTS,
  HTML_INLINE_WHITESPACE_PATTERN,
  HTML_NUMERIC_ENTITY_DECIMAL_GROUP,
  HTML_NUMERIC_ENTITY_HEX_GROUP,
  HTML_NUMERIC_ENTITY_PATTERN,
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

/**
 * §4.14: снимает числовые HTML-сущности (&#160; десятичная, &#xA0; шестнадцатеричная),
 * которыми размечены сайты компаний — именованные сущности (&nbsp; и т.п.) уже
 * снимает unescapeHtmlEntities выше, эта функция дополняет её, а не заменяет
 * (аддитивно: разбор hh.ru/it-vacancies.ru/geekjob.ru её не вызывает и не меняется).
 *
 * Невалидный или выходящий за пределы code point (String.fromCodePoint бросает
 * RangeError на значениях вне 0..0x10FFFF) оставляет совпадение как есть — не
 * бросает наружу, просто не декодирует то, что декодировать нельзя.
 */
export function decodeNumericHtmlEntities(value: string): string {
  let result = '';
  let lastIndex = 0;

  for (const match of value.matchAll(HTML_NUMERIC_ENTITY_PATTERN)) {
    const hex = match[HTML_NUMERIC_ENTITY_HEX_GROUP];
    const decimal = match[HTML_NUMERIC_ENTITY_DECIMAL_GROUP];
    const codePoint = hex !== undefined ? parseInt(hex, 16) : parseInt(decimal ?? '', 10);
    const index = match.index ?? lastIndex;

    result += value.slice(lastIndex, index);

    try {
      result += String.fromCodePoint(codePoint);
    } catch {
      result += match[0];
    }

    lastIndex = index + match[0].length;
  }

  result += value.slice(lastIndex);

  return result;
}

/**
 * §4.11.7: внутренний HTML открывающего тега `<div …>`, найденного вызывающим по
 * своему `openPattern` (у it-vacancies.ru — класс content, у geekjob.ru — id
 * vacancy-description). Разбор — один проход вперёд со счётчиком вложенности, без
 * HTML-библиотеки (§2.4 п.7: cheerio/jsdom не добавляются) и без «жадного» регекса
 * до последнего </div>: тот захватил бы полстраницы, а нежадный — оборвался бы на
 * первом вложенном закрывающем теге. Бэктрекинга здесь нет: HTML_DIV_TOKEN_PATTERN
 * ищет только токены тегов, а счётчик двигается линейно.
 *
 * Перенесена из it-vacancies-html.helpers.ts при добавлении geekjob.ru: оба
 * источника разбирают SSR-блок описания идентичным алгоритмом, только открывающий
 * тег у них разный — дублировать 35 строк парсинга означало бы гарантированное
 * расхождение при первой правке.
 *
 * Атрибут вида `data-x="</div>"` теоретически сбил бы счётчик, но такой разметки
 * ни на одной странице источников нет, а ошибка деградирует мягко — вызывающий
 * откатывается на фолбэк-описание, а не срывает прогон.
 *
 * Никогда не бросает: открывающий тег не найден или вложенность не закрылась — null.
 */
export function extractBalancedDivBlock(html: string, openPattern: RegExp): string | null {
  const open = openPattern.exec(html);

  if (open === null) {
    return null;
  }

  const start = open.index + open[0].length;

  // Локальная копия глобального регекса: lastIndex мутируется проходом, и общий
  // экземпляр из constants сломал бы следующий вызов.
  const tokens = new RegExp(HTML_DIV_TOKEN_PATTERN.source, HTML_DIV_TOKEN_PATTERN.flags);

  tokens.lastIndex = start;

  let depth = 1;
  let token = tokens.exec(html);

  while (token !== null) {
    if (token[0].startsWith(HTML_DIV_CLOSE_TOKEN_PREFIX)) {
      depth -= 1;

      if (depth === 0) {
        return html.slice(start, token.index);
      }
    } else {
      depth += 1;
    }

    token = tokens.exec(html);
  }

  return null;
}
