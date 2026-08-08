import {
  SYNC_SUMMARY_CHECKED_LABEL,
  SYNC_SUMMARY_CLOSED_LABEL,
  SYNC_SUMMARY_ERRORS_LABEL,
  SYNC_SUMMARY_SEPARATOR,
  SYNC_SUMMARY_SKIPPED_LABEL,
  SYNC_SUMMARY_VALUE_SEPARATOR,
  SYNC_PROBLEM_OUTCOMES,
} from '../constants/sync.constants';
import type { SyncOutcome } from '../types/application.type';
import type { SyncSummary, SyncSummaryItem } from '../types/sync.interfaces';

/** Производные от сводки прогона /sync-open (§7.7): чистые функции без литералов внутри. */

/** §7.7: именно RATE_LIMITED/ERROR превращают сводку в предупреждение. */
export function isSyncProblemOutcome(outcome: SyncOutcome): boolean {
  return SYNC_PROBLEM_OUTCOMES.some((problem) => problem === outcome);
}

/** counts.RATE_LIMITED + counts.ERROR — то же число, что длина списка проблемных, по построению. */
export function countSyncErrors(summary: SyncSummary): number {
  return SYNC_PROBLEM_OUTCOMES.reduce((total, outcome) => total + summary.counts[outcome], 0);
}

export function selectSyncProblemItems(summary: SyncSummary): SyncSummaryItem[] {
  return summary.items.filter((item) => isSyncProblemOutcome(item.outcome));
}

/**
 * «Проверено 12 · закрыто 1 · ошибок 0 · не hh.ru 2» (§7.7). NOT_FOUND отдельной цифрой
 * не выводится намеренно: sync-open обрабатывает только OPEN, а NOT_FOUND по §4.3 всегда
 * закрывает запись — эти записи уже посчитаны в «закрыто».
 */
export function formatSyncSummaryText(summary: SyncSummary): string {
  const parts = [
    `${SYNC_SUMMARY_CHECKED_LABEL}${SYNC_SUMMARY_VALUE_SEPARATOR}${summary.total}`,
    `${SYNC_SUMMARY_CLOSED_LABEL}${SYNC_SUMMARY_VALUE_SEPARATOR}${summary.closed}`,
    `${SYNC_SUMMARY_ERRORS_LABEL}${SYNC_SUMMARY_VALUE_SEPARATOR}${countSyncErrors(summary)}`,
    `${SYNC_SUMMARY_SKIPPED_LABEL}${SYNC_SUMMARY_VALUE_SEPARATOR}${summary.counts.SKIPPED_NOT_HH}`,
  ];

  return parts.join(SYNC_SUMMARY_SEPARATOR);
}
