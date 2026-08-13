import { VACANCY_ALLOWED_PROTOCOLS } from './vacancies.constants';

/**
 * Абсолютизирует и валидирует src логотипа компании, найденный парсером страницы
 * источника (§4.10). Общая для hh.ru и getmatch.ru: разница между источниками —
 * только baseUrl (их *_SITE_BASE_URL) и allowedHostPattern (allow-list своего хоста).
 *
 * Проверка хоста ДО того, как значение попадёт в Vacancy.logoUrl, отсекает SSRF:
 * без неё разметка страницы могла бы указать на произвольный внутренний адрес,
 * а CompanyLogoService.download сходил бы туда без вопросов.
 *
 * Никогда не бросает: любой мусор на входе — это null, а не исключение.
 */
export function resolveVacancyLogoUrl(
  rawSrc: string | null,
  baseUrl: string,
  allowedHostPattern: RegExp,
): string | null {
  if (rawSrc === null) {
    return null;
  }

  let url: URL;

  try {
    url = new URL(rawSrc, baseUrl);
  } catch {
    return null;
  }

  if (!VACANCY_ALLOWED_PROTOCOLS.includes(url.protocol)) {
    return null;
  }

  if (!allowedHostPattern.test(url.hostname)) {
    return null;
  }

  return url.toString();
}
