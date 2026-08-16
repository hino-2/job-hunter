import type { Application } from '../types/application.interfaces';

/**
 * Колбэки исхода живут в опциях хука, а не в вызове apply() — та же причина, что
 * у SyncApplicationOptions: второй apply() отцепляет предыдущую мутацию от
 * MutationObserver, а клик по «Отклик» на нескольких лидах подряд — обычное дело.
 */
export interface ApplyVacancyLeadOptions {
  onApplied: (application: Application) => void;
  onAlreadyApplied: (message: string) => void;
  onFailed: (error: Error) => void;
}

export interface ApplyVacancyLeadController {
  /** id лидов с летящим POST :id/apply. В аккордеон уходит срез-boolean, а не сам набор. */
  applyingIds: ReadonlySet<string>;
  /** Стабильная ссылка: проп доезжает до memo-аккордеонов. */
  apply: (id: string) => void;
}
