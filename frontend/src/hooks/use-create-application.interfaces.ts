import type { Application } from '../types/application.interfaces';

/**
 * Колбэки исхода живут в опциях хука, а не в вызове mutate() — тем же приёмом,
 * что useUpdateApplication (см. use-update-application.interfaces.ts).
 */
export interface CreateApplicationOptions {
  onCreated: (created: Application) => void;
  onFailed: (error: Error) => void;
}
