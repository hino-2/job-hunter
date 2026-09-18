import { extractBalancedDivBlock } from '../common/html.helpers';
import { IT_VACANCIES_CONTENT_BLOCK_OPEN_PATTERN } from './it-vacancies.constants';

/**
 * §4.11.7: внутренний HTML блока <div class="… content"> — полное описание вакансии
 * из SSR-разметки. В JSON-LD источник отдаёт description обрезанным, поэтому для
 * ИИ-отбора нужен именно этот блок.
 *
 * Сам алгоритм (счётчик вложенности <div>) переехал в common/html.helpers.ts
 * (extractBalancedDivBlock) при добавлении geekjob.ru — второй источник разбирает
 * тем же способом свой блок #vacancy-description. Функция и её имя остаются здесь:
 * it-vacancies-description.parser.ts импортирует именно extractContentBlock.
 */
export function extractContentBlock(html: string): string | null {
  return extractBalancedDivBlock(html, IT_VACANCIES_CONTENT_BLOCK_OPEN_PATTERN);
}
