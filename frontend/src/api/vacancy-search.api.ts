import {
  API_PATH_SEPARATOR,
  VACANCY_LEADS_ENDPOINT,
  VACANCY_LEADS_SCAN_PATH_SEGMENT,
  VACANCY_LEADS_SCAN_STATUS_PATH_SEGMENT,
  VACANCY_SEARCH_SETTINGS_ENDPOINT,
} from '../constants/api.constants';
import type {
  ScanAcceptedResponse,
  ScanStatusResponse,
  VacancyLead,
  VacancyLeadsFilters,
  VacancyLeadsQueryParams,
  VacancyLeadUpdate,
  VacancySearchSettings,
  VacancySearchSettingsUpdate,
} from '../types/vacancy-search.interfaces';
import { apiClient } from './client';

/**
 * Состояние панели фильтров экрана «Вакансии» → query-параметры §5.7, тем же приёмом,
 * что toApplicationsQueryParams: значения, совпадающие с дефолтом бэкенда, не отправляются
 * вовсе, иначе в кэше React Query завёлся бы лишний ключ, эквивалентный запросу без фильтра.
 */
export function toVacancyLeadsQueryParams(filters: VacancyLeadsFilters): VacancyLeadsQueryParams {
  const search = filters.search.trim();
  const params: VacancyLeadsQueryParams = {
    sort: filters.sort,
    order: filters.order,
  };

  if (filters.showHiddenOnly) {
    params.hidden = 'only';
  }

  if (search.length > 0) {
    params.search = search;
  }

  return params;
}

/**
 * GET /api/vacancy-leads (§5.7). Плоский массив без пагинации (§12); серверный
 * потолок (VACANCY_LEADS_LIST_LIMIT) — на бэкенде, клиент его не знает и не проверяет.
 */
export async function fetchVacancyLeads(params: VacancyLeadsQueryParams): Promise<VacancyLead[]> {
  const response = await apiClient.get<VacancyLead[]>(VACANCY_LEADS_ENDPOINT, { params });

  return response.data;
}

/**
 * PATCH /api/vacancy-leads/:id (§5.7, §7.9.3) — скрытие либо возврат вакансии.
 * Идемпотентен: повторный вызов с тем же значением hidden не переписывает hidden_at.
 */
export async function updateVacancyLead(
  id: string,
  patch: VacancyLeadUpdate,
): Promise<VacancyLead> {
  const response = await apiClient.patch<VacancyLead>(
    `${VACANCY_LEADS_ENDPOINT}${API_PATH_SEPARATOR}${id}`,
    patch,
  );

  return response.data;
}

/**
 * POST /api/vacancy-leads/scan (§5.7, §4.11.9). Тела запроса нет. Ответ 202 приходит
 * сразу, не дожидаясь конца прогона — таймаут по умолчанию не трогаем (api.constants.ts).
 * 409 (прогон уже идёт где-то ещё) — штатный исход, а не сбой; различать его по коду
 * должен вызывающий хук (§7.9.2), здесь исключение просто пробрасывается.
 */
export async function startVacancyScan(): Promise<ScanAcceptedResponse> {
  const response = await apiClient.post<ScanAcceptedResponse>(
    `${VACANCY_LEADS_ENDPOINT}${API_PATH_SEPARATOR}${VACANCY_LEADS_SCAN_PATH_SEGMENT}`,
  );

  return response.data;
}

/**
 * GET /api/vacancy-leads/scan/status (§5.7). Читает снимок состояния прогона из памяти
 * процесса — быстрый запрос вне зависимости от того, идёт ли сам прогон.
 */
export async function fetchScanStatus(): Promise<ScanStatusResponse> {
  const response = await apiClient.get<ScanStatusResponse>(
    `${VACANCY_LEADS_ENDPOINT}${API_PATH_SEPARATOR}${VACANCY_LEADS_SCAN_STATUS_PATH_SEGMENT}`,
  );

  return response.data;
}

/** GET /api/vacancy-search-settings (§3.6, §5.7) — единственная строка настроек. */
export async function fetchVacancySearchSettings(): Promise<VacancySearchSettings> {
  const response = await apiClient.get<VacancySearchSettings>(VACANCY_SEARCH_SETTINGS_ENDPOINT);

  return response.data;
}

/**
 * PUT /api/vacancy-search-settings (§5.7) — ресурс один, форма всегда отправляет
 * его целиком (searchUrlTemplate и updatedAt в тело не входят).
 */
export async function updateVacancySearchSettings(
  payload: VacancySearchSettingsUpdate,
): Promise<VacancySearchSettings> {
  const response = await apiClient.put<VacancySearchSettings>(
    VACANCY_SEARCH_SETTINGS_ENDPOINT,
    payload,
  );

  return response.data;
}
