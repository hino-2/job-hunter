import { htmlToPlainText } from '../common/html.helpers';
import { JSON_LD_FIELD } from '../vacancies/vacancies.constants';
import {
  extractJsonLdEntries,
  findJobPosting,
  readString,
} from '../vacancies/vacancy-json-ld.helpers';
import type { ItVacanciesDescription } from './it-vacancies.interfaces';
import { extractContentBlock } from './it-vacancies-html.helpers';
import { readItVacanciesLogoUrl } from './it-vacancies-json-ld.helpers';

/**
 * §4.11.7, §4.10: описание вакансии для ИИ-отбора и логотип компании лида — из
 * одной уже загруженной страницы, без второго сетевого запроса.
 *
 * Источник описания — SSR-блок <div class="… content">, а НЕ JSON-LD: в JSON-LD
 * it-vacancies.ru отдаёт description обрезанным (ровно одно «...» перед
 * "employmentType"), и модель получала бы четверть текста. Обрезанное значение
 * оставлено фолбэком: лид с коротким описанием полезнее выброшенного лида, а
 * молчаливая правка Tailwind-классов не должна ронять прогон.
 *
 * Возвращает plain text (§4.11.7) — обрезка по VACANCY_AI_DESCRIPTION_MAX_CHARS
 * остаётся заботой vacancy-ai/.
 *
 * Никогда не бросает: любой мусор на входе — null.
 */
export function parseItVacanciesDescription(
  html: unknown,
  logoBaseUrl: string,
): ItVacanciesDescription | null {
  if (typeof html !== 'string' || html.length === 0) {
    return null;
  }

  const jobPosting = findJobPosting(extractJsonLdEntries(html));
  const logoUrl = readItVacanciesLogoUrl(jobPosting, logoBaseUrl);
  const contentBlock = extractContentBlock(html);
  const description =
    contentBlock === null
      ? readFallbackDescription(jobPosting)
      : htmlToPlainText(contentBlock).trim();

  if (description === null || description.length === 0) {
    return null;
  }

  return { description, logoUrl };
}

/** Обрезанное источником JSON-LD-описание — только когда SSR-блок не найден. */
function readFallbackDescription(jobPosting: Record<string, unknown> | null): string | null {
  if (jobPosting === null) {
    return null;
  }

  const raw = readString(jobPosting, JSON_LD_FIELD.DESCRIPTION);

  return raw === null ? null : htmlToPlainText(raw).trim();
}
