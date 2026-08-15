import { API_BASE_URL, API_PATH_SEPARATOR, LOGO_PATH_SEGMENT } from '../constants/api.constants';
import { COMPANY_INITIAL_FALLBACK } from '../constants/company-logo.constants';

/**
 * Относительный путь к байтам логотипа (§4.10, §5.1). API_BASE_URL обязателен: `<img>`
 * не проходит через axios и его `baseURL` не получит. Эндпоинт — параметром: одна функция
 * обслуживает и отклики (`APPLICATIONS_ENDPOINT`), и найденные вакансии (`VACANCY_LEADS_ENDPOINT`).
 */
export function buildCompanyLogoUrl(endpoint: string, id: string): string {
  return `${API_BASE_URL}${endpoint}${API_PATH_SEPARATOR}${id}${API_PATH_SEPARATOR}${LOGO_PATH_SEGMENT}`;
}

/**
 * Буква-фолбэк Avatar'а (§4.10, §7.2.1): первый непробельный символ названия компании
 * в верхнем регистре. toUpperCase учитывает не-ASCII (кириллицу и т. п.) корректно.
 * Символ берётся по кодовой точке, а не `charAt(0)`: у названия, начинающегося с эмодзи,
 * первая единица UTF-16 — половина суррогатной пары, и в DOM она отрисовалась бы как `�`.
 */
export function buildCompanyInitial(company: string): string {
  const trimmed = company.trim();
  const [firstCodePoint] = trimmed;

  if (firstCodePoint === undefined) {
    return COMPANY_INITIAL_FALLBACK;
  }

  return firstCodePoint.toUpperCase();
}
