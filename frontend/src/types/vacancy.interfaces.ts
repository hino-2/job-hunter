import type { VacancySource } from './application.type';

/**
 * Ответ POST /api/vacancies/preview (§5.3). Ручная копия VacancyPreviewResponse
 * (backend/src/vacancies/vacancies.interfaces.ts) — порядок и имена полей совпадают
 * построчно, тем же приёмом, что и Application (§3.4).
 */
export interface VacancyPreview {
  source: VacancySource | null;
  vacancyExternalId: string | null;
  company: string | null;
  position: string | null;
  archived: boolean | null;
}

/** Тело POST /api/vacancies/preview (§5.3). */
export interface VacancyPreviewRequest {
  url: string;
}
