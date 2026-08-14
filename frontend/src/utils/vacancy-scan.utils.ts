import {
  SCAN_PROGRESS_CREATED_LABEL,
  SCAN_PROGRESS_DUPLICATES_LABEL,
  SCAN_PROGRESS_FAILED_LABEL,
  SCAN_PROGRESS_PAGES_LABEL,
  SCAN_PROGRESS_REJECTED_LABEL,
  SCAN_PROGRESS_SEEN_LABEL,
  SCAN_STATUS,
  SCAN_STOPPED_REASON,
  SCAN_STOPPED_REASON_LABELS,
  SCAN_SUMMARY_SEPARATOR,
  SCAN_SUMMARY_VALUE_SEPARATOR,
} from '../constants/vacancy-search.constants';
import { NOTIFICATION_SEVERITY } from '../constants/notification.constants';
import type { NotificationSeverity } from '../types/notification.type';
import type { ScanProgress, ScanStatusResponse } from '../types/vacancy-search.interfaces';

/** Производные статуса прогона поиска (§7.9.2), чистые функции без литералов внутри. */

/** «страниц 3 · просмотрено 40 · найдено 2 · дублей 5 · отклонено моделью 12 · ошибок 0». */
export function formatScanProgressText(progress: ScanProgress): string {
  const rejectedByModel = progress.rejectedTitle + progress.rejectedDescription;
  const parts = [
    `${SCAN_PROGRESS_PAGES_LABEL}${SCAN_SUMMARY_VALUE_SEPARATOR}${progress.pagesFetched}`,
    `${SCAN_PROGRESS_SEEN_LABEL}${SCAN_SUMMARY_VALUE_SEPARATOR}${progress.itemsSeen}`,
    `${SCAN_PROGRESS_CREATED_LABEL}${SCAN_SUMMARY_VALUE_SEPARATOR}${progress.created}`,
    `${SCAN_PROGRESS_DUPLICATES_LABEL}${SCAN_SUMMARY_VALUE_SEPARATOR}${progress.duplicates}`,
    `${SCAN_PROGRESS_REJECTED_LABEL}${SCAN_SUMMARY_VALUE_SEPARATOR}${rejectedByModel}`,
    `${SCAN_PROGRESS_FAILED_LABEL}${SCAN_SUMMARY_VALUE_SEPARATOR}${progress.failed}`,
  ];

  return parts.join(SCAN_SUMMARY_SEPARATOR);
}

/** Итоговая сводка после остановки прогона: причина человеческим текстом + счётчики. */
export function formatScanSummaryText(status: ScanStatusResponse): string {
  const reasonLabel =
    status.stoppedReason === null ? null : SCAN_STOPPED_REASON_LABELS[status.stoppedReason];
  const parts = [reasonLabel, formatScanProgressText(status.progress), status.message].filter(
    (part): part is string => part !== null && part.length > 0,
  );

  return parts.join(SCAN_SUMMARY_SEPARATOR);
}

/**
 * §7.9.2: сбой самого запроса — отдельный канал (error-Snackbar, не эта функция).
 * Здесь — исключительно severity Alert'а по уже полученному статусу: во время прогона
 * info, stoppedReason === 'ERROR' — error, успешный прогон — success, а created === 0 — info.
 */
export function selectScanAlertSeverity(status: ScanStatusResponse): NotificationSeverity {
  if (status.status === SCAN_STATUS.RUNNING) {
    return NOTIFICATION_SEVERITY.INFO;
  }

  if (status.stoppedReason === SCAN_STOPPED_REASON.ERROR) {
    return NOTIFICATION_SEVERITY.ERROR;
  }

  if (status.progress.created === 0) {
    return NOTIFICATION_SEVERITY.INFO;
  }

  return NOTIFICATION_SEVERITY.SUCCESS;
}
