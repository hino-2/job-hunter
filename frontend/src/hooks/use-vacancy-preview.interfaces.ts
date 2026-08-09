import type { VacancyPreview } from '../types/vacancy.interfaces';

export interface VacancyPreviewOptions {
  /** url — ровно то, что уходило в запрос: вызывающий сам решает, не протух ли ответ. */
  onLoaded: (preview: VacancyPreview, url: string) => void;
  onFailed: (error: Error) => void;
}
