import {
  API_PATH_SEPARATOR,
  APPLICATIONS_ENDPOINT,
  SYNC_OPEN_PATH_SEGMENT,
  SYNC_OPEN_REQUEST_TIMEOUT_MS,
  SYNC_PATH_SEGMENT,
  SYNC_REQUEST_TIMEOUT_MS,
} from '../constants/api.constants';
import { STATUS_FILTER } from '../constants/application.constants';
import type {
  Application,
  ApplicationCreate,
  ApplicationsFilters,
  ApplicationsQueryParams,
  ApplicationUpdate,
} from '../types/application.interfaces';
import type { SyncResult, SyncSummary } from '../types/sync.interfaces';
import { apiClient } from './client';

/**
 * Состояние панели фильтров → query-параметры §5.1.
 *
 * Ключи с пустым значением не добавляются вовсе: React Query хеширует объект-параметры
 * целиком, поэтому `search: ''` завёл бы отдельную запись в кэше, эквивалентную запросу
 * без поиска (бэкенд пустой search и так игнорирует).
 */
export function toApplicationsQueryParams(filters: ApplicationsFilters): ApplicationsQueryParams {
  const search = filters.search.trim();
  const params: ApplicationsQueryParams = {
    sort: filters.sort,
    order: filters.order,
  };

  if (filters.status !== STATUS_FILTER.ALL) {
    params.status = filters.status;
  }

  if (search.length > 0) {
    params.search = search;
  }

  return params;
}

/** GET /api/applications (§5.1). Плоский массив без пагинации; клиент ничего не досортировывает. */
export async function fetchApplications(params: ApplicationsQueryParams): Promise<Application[]> {
  const response = await apiClient.get<Application[]>(APPLICATIONS_ENDPOINT, { params });

  return response.data;
}

/**
 * PATCH /api/applications/:id (§5.1). Тело — только изменённые поля (§7.3); ответ —
 * полная запись, поэтому докачивать её отдельным GET не нужно.
 */
export async function updateApplication(
  id: string,
  patch: ApplicationUpdate,
): Promise<Application> {
  const response = await apiClient.patch<Application>(
    `${APPLICATIONS_ENDPOINT}${API_PATH_SEPARATOR}${id}`,
    patch,
  );

  return response.data;
}

/** POST /api/applications (§5.1, §7.4). status не отправляется — бэкенд создаёт OPEN. */
export async function createApplication(payload: ApplicationCreate): Promise<Application> {
  const response = await apiClient.post<Application>(APPLICATIONS_ENDPOINT, payload);

  return response.data;
}

/** DELETE /api/applications/:id (§5.1, §7.5) — 204 без тела, response.data не читаем. */
export async function deleteApplication(id: string): Promise<void> {
  await apiClient.delete(`${APPLICATIONS_ENDPOINT}${API_PATH_SEPARATOR}${id}`);
}

/**
 * POST /api/applications/:id/sync (§5.2). Любой исход приходит с кодом 200 — это результат
 * операции, а не ошибка. Таймаут поднят: один запрос к источнику — до 10 с, плюс два ретрая.
 */
export async function syncApplication(id: string): Promise<SyncResult> {
  const response = await apiClient.post<SyncResult>(
    `${APPLICATIONS_ENDPOINT}${API_PATH_SEPARATOR}${id}${API_PATH_SEPARATOR}${SYNC_PATH_SEGMENT}`,
    undefined,
    { timeout: SYNC_REQUEST_TIMEOUT_MS },
  );

  return response.data;
}

/** POST /api/applications/sync-open (§5.2). Операция синхронная, до 50 записей по 3 в параллель. */
export async function syncOpenApplications(): Promise<SyncSummary> {
  const response = await apiClient.post<SyncSummary>(
    `${APPLICATIONS_ENDPOINT}${API_PATH_SEPARATOR}${SYNC_OPEN_PATH_SEGMENT}`,
    undefined,
    { timeout: SYNC_OPEN_REQUEST_TIMEOUT_MS },
  );

  return response.data;
}
