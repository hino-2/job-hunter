import type { HhPreview } from '../types/hh.interfaces';

export interface HhPreviewOptions {
  /** url — ровно то, что уходило в запрос: вызывающий сам решает, не протух ли ответ. */
  onLoaded: (preview: HhPreview, url: string) => void;
  onFailed: (error: Error) => void;
}
