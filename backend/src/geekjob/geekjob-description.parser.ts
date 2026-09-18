import { htmlToPlainText } from '../common/html.helpers';
import { resolveVacancyLogoUrl } from '../vacancies/vacancy-logo-url.helpers';
import { GEEKJOB_LOGO_ALLOWED_HOST_PATTERN } from './geekjob.constants';
import { extractGeekjobDescriptionBlock, readGeekjobLogoSrc } from './geekjob-html.helpers';
import type { GeekjobDescription } from './geekjob.interfaces';

/**
 * §4.11.7, §4.10: описание вакансии для ИИ-отбора и логотип компании лида — из
 * одной уже загруженной страницы, без второго сетевого запроса.
 *
 * В отличие от it-vacancies.ru у geekjob.ru нет JSON-LD-фолбэка с обрезанным
 * описанием — единственный источник текста это #vacancy-description. Отсутствие
 * блока — fail-closed null (§4.11.7): лид не проходит этап отбора, а не тихо
 * теряет описание.
 *
 * Возвращает plain text (§4.11.7) — обрезка по VACANCY_AI_DESCRIPTION_MAX_CHARS
 * остаётся заботой vacancy-ai/.
 *
 * Никогда не бросает: любой мусор на входе — null.
 */
export function parseGeekjobDescription(
  html: unknown,
  logoBaseUrl: string,
): GeekjobDescription | null {
  if (typeof html !== 'string' || html.length === 0) {
    return null;
  }

  const block = extractGeekjobDescriptionBlock(html);

  if (block === null) {
    return null;
  }

  const description = htmlToPlainText(block).trim();

  if (description.length === 0) {
    return null;
  }

  const logoUrl = resolveVacancyLogoUrl(
    readGeekjobLogoSrc(html),
    logoBaseUrl,
    GEEKJOB_LOGO_ALLOWED_HOST_PATTERN,
  );

  return { description, logoUrl };
}
