import type { SyncSummary } from '../types/sync.interfaces';

export interface SyncAllOpenOptions {
  onFinished: (summary: SyncSummary) => void;
  onFailed: (error: Error) => void;
}
