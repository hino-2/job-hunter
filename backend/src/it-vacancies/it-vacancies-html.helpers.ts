import {
  IT_VACANCIES_CONTENT_BLOCK_OPEN_PATTERN,
  IT_VACANCIES_DIV_CLOSE_TOKEN_PREFIX,
  IT_VACANCIES_DIV_TOKEN_PATTERN,
} from './it-vacancies.constants';

/**
 * §4.11.7: внутренний HTML блока <div class="… content"> — полное описание вакансии
 * из SSR-разметки. В JSON-LD источник отдаёт description обрезанным, поэтому для
 * ИИ-отбора нужен именно этот блок.
 *
 * Разбор — один проход вперёд со счётчиком вложенности, без HTML-библиотеки (§2.4
 * п.7: cheerio/jsdom не добавляются) и без «жадного» регекса до последнего </div>:
 * тот захватил бы полстраницы, а нежадный — оборвался бы на первом вложенном
 * закрывающем теге. Бэктрекинга здесь нет: IT_VACANCIES_DIV_TOKEN_PATTERN ищет
 * только токены тегов, а счётчик двигается линейно.
 *
 * Атрибут вида `data-x="</div>"` теоретически сбил бы счётчик, но такой разметки на
 * странице нет, а ошибка деградирует мягко — вызывающий откатится на обрезанное
 * описание из JSON-LD, а не сорвёт прогон.
 *
 * Никогда не бросает: блок не найден или вложенность не закрылась — null.
 */
export function extractContentBlock(html: string): string | null {
  const open = IT_VACANCIES_CONTENT_BLOCK_OPEN_PATTERN.exec(html);

  if (open === null) {
    return null;
  }

  const start = open.index + open[0].length;

  // Локальная копия глобального регекса: lastIndex глобального шаблона мутируется
  // проходом, и общий экземпляр из constants сломал бы следующий вызов.
  const tokens = new RegExp(
    IT_VACANCIES_DIV_TOKEN_PATTERN.source,
    IT_VACANCIES_DIV_TOKEN_PATTERN.flags,
  );

  tokens.lastIndex = start;

  let depth = 1;
  let token = tokens.exec(html);

  while (token !== null) {
    if (token[0].startsWith(IT_VACANCIES_DIV_CLOSE_TOKEN_PREFIX)) {
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
