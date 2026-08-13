import type { SyncOutcome, VacancySource } from '../../types/application.type';

export interface SyncStatusIconProps {
  outcome: SyncOutcome | null;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
  /** §4.8: источник вакансии — третья строка tooltip'а, независимо от outcome. */
  source: VacancySource | null;
}
