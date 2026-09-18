import {
  API_BASE_URL,
  API_PATH_SEPARATOR,
  SOURCE_ICON_PATH_SEGMENT,
  VACANCY_SOURCES_ENDPOINT,
} from '../constants/api.constants';
import type { VacancySource } from '../types/application.type';

/**
 * Относительный путь к байтам фавикона источника (§5.8, §4.10). Отдельная функция,
 * а не параметризация buildCompanyLogoUrl: там последний сегмент — id записи, здесь —
 * фиксированное имя источника, и объединение обеих усложнило бы оба места вызова.
 * API_BASE_URL обязателен: `<img>` не проходит через axios и его baseURL не получит.
 */
export function buildSourceIconUrl(source: VacancySource): string {
  return `${API_BASE_URL}${VACANCY_SOURCES_ENDPOINT}${API_PATH_SEPARATOR}${source}${API_PATH_SEPARATOR}${SOURCE_ICON_PATH_SEGMENT}`;
}
