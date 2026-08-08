import type { SyncResult } from '../types/sync.interfaces';

/**
 * Колбэки исхода живут в опциях хука, а не в вызове mutate() — та же причина, что
 * у UpdateApplicationOptions: второй mutate() отцепляет предыдущую мутацию
 * от MutationObserver, и переданные в тот вызов колбэки уже не сработают, а клик
 * по 🔄 на двух строках подряд — обычное дело.
 */
export interface SyncApplicationOptions {
  onSynced: (result: SyncResult) => void;
  onFailed: (error: Error) => void;
}

export interface SyncApplicationController {
  /** id записей с летящим /sync. В аккордеон уходит срез-boolean, а не сам набор. */
  syncingIds: ReadonlySet<string>;
  /** Стабильная ссылка: проп доезжает до memo-аккордеонов. */
  sync: (id: string) => void;
}
