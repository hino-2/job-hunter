import { HH_PREVIEW_ENDPOINT } from '../constants/api.constants';
import type { HhPreview, HhPreviewRequest } from '../types/hh.interfaces';
import { apiClient } from './client';

/**
 * POST /api/hh/preview (§5.3). В БД ничего не пишется — это подсказка для формы создания
 * (§4.4). Нераспознанная ссылка отдаёт 200 с нулевыми полями, поэтому ошибкой считается
 * только реальный сбой похода в hh.ru (404/502).
 */
export async function previewVacancy(url: string): Promise<HhPreview> {
  const body: HhPreviewRequest = { url };
  const response = await apiClient.post<HhPreview>(HH_PREVIEW_ENDPOINT, body);

  return response.data;
}
