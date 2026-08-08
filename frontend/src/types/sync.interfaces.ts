import type { Application } from './application.interfaces';
import type { SyncOutcome } from './application.type';
import type { SyncOutcomeCounts } from './sync.type';

/**
 * Ручная копия backend/src/applications/applications.interfaces.ts:97-118 (§5.2), поле
 * в поле — тем же приёмом, что и Application (§3.4).
 */

/** Тело ответа POST /api/applications/:id/sync. */
export interface SyncResult {
  outcome: SyncOutcome;
  message: string | null;
  application: Application;
}

/** Элемент items в сводке. */
export interface SyncSummaryItem {
  id: string;
  company: string;
  outcome: SyncOutcome;
  message: string | null;
}

/** Тело ответа POST /api/applications/sync-open. */
export interface SyncSummary {
  total: number;
  counts: SyncOutcomeCounts;
  closed: number;
  /** ВСЕ записи прогона, а не только проблемные (sync-summary.dto.ts:43). Фильтрует фронт. */
  items: SyncSummaryItem[];
  /** Объявлено ради построчной сверки с бэкендом; сознательно не используется — см. useSyncAllOpen. */
  applications: Application[];
}
