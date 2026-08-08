import type { SyncOutcome } from '../types/application.type';

export interface SyncStatusIconProps {
  outcome: SyncOutcome | null;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
}
