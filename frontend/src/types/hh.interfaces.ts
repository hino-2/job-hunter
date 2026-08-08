/**
 * Ответ POST /api/hh/preview (§5.3). Ручная копия HhPreviewDto
 * (backend/src/hh/dto/hh-preview.dto.ts:11-16) — порядок и имена полей совпадают
 * построчно, тем же приёмом, что и Application (§3.4).
 */
export interface HhPreview {
  hhVacancyId: string | null;
  company: string | null;
  position: string | null;
  archived: boolean | null;
  vacancyType: string | null;
}

/** Тело POST /api/hh/preview (§5.3). */
export interface HhPreviewRequest {
  url: string;
}
