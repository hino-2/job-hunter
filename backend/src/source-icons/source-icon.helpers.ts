import { VACANCY_SOURCE_ORDER } from '../vacancies/vacancies.constants';
import { SOURCE_ICON_ALLOWED_HOST_PATTERNS, SOURCE_ICON_PATHS } from './source-icon.constants';
import type { VacancySource } from '../applications/applications.type';

/**
 * §5.8: явный предикат вместо приведения через as (§10 п.4) — значение :source
 * приходит из URL как произвольная строка.
 */
export function isVacancySource(value: string): value is VacancySource {
  return (VACANCY_SOURCE_ORDER as readonly string[]).includes(value);
}

/**
 * Абсолютный URL иконки источника либо null (§5.8) — защита в глубину, зеркало
 * resolveVacancyLogoUrl (vacancies/vacancy-logo-url.helpers.ts): хост, полученный из
 * SOURCE_ICON_PATHS + siteBaseUrl, перепроверяется allow-list'ом того же источника
 * ещё раз, до похода в сеть.
 */
export function buildSourceIconUrl(siteBaseUrl: string, source: VacancySource): string | null {
  let url: URL;

  try {
    url = new URL(SOURCE_ICON_PATHS[source], siteBaseUrl);
  } catch {
    return null;
  }

  if (!SOURCE_ICON_ALLOWED_HOST_PATTERNS[source].test(url.hostname)) {
    return null;
  }

  return url.toString();
}
