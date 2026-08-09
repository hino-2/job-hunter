import { VACANCY_PREVIEW_ENDPOINT } from '../constants/api.constants';
import type { VacancyPreview, VacancyPreviewRequest } from '../types/vacancy.interfaces';
import { apiClient } from './client';

/**
 * POST /api/vacancies/preview (§5.3). В БД ничего не пишется — это подсказка для формы создания
 * (§4.4). Нераспознанная ссылка отдаёт 200 с нулевыми полями, поэтому ошибкой считается
 * только реальный сбой похода к источнику (404/502).
 */
export async function previewVacancy(url: string): Promise<VacancyPreview> {
  const body: VacancyPreviewRequest = { url };
  const response = await apiClient.post<VacancyPreview>(VACANCY_PREVIEW_ENDPOINT, body);

  return response.data;
}
