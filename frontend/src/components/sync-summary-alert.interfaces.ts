import type { SyncSummary } from '../types/sync.interfaces';

export interface SyncSummaryAlertProps {
  summary: SyncSummary;
  onDismiss: () => void;
}
