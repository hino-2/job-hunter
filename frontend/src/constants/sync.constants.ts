import { SYNC_OUTCOME } from './application.constants';
import { NOTIFICATION_SEVERITY } from './notification.constants';
import type { NotificationSeverity } from '../types/notification.type';
import type { SyncOutcome } from '../types/application.type';

/** Литералы фичи синхронизации (§7.6, §7.7). Тексты — только отсюда, в компонентах их нет. */

export const SYNC_ROW_LABEL = 'Обновить статус';
export const SYNC_ROW_PENDING_LABEL = 'Обновляем…';
export const SYNC_ALL_LABEL = 'Обновить все открытые';
export const SYNC_ALL_PENDING_LABEL = 'Обновляем…';
export const SYNC_ALL_PROGRESS_LABEL = 'Идёт обновление открытых записей';
export const SYNC_ERROR_FALLBACK_MESSAGE = 'Не удалось обновить запись';
export const SYNC_ALL_ERROR_FALLBACK_MESSAGE = 'Не удалось обновить открытые записи';

/**
 * §7.6. Умышленно НЕ совпадает с SYNC_OUTCOME_ICON_COLORS (application.constants.ts):
 * там NOT_FOUND/SKIPPED_UNSUPPORTED окрашены как warning, а здесь это info-исходы.
 */
export const SYNC_OUTCOME_NOTIFICATION_SEVERITY: Record<SyncOutcome, NotificationSeverity> = {
  OK: NOTIFICATION_SEVERITY.SUCCESS,
  NOT_FOUND: NOTIFICATION_SEVERITY.INFO,
  SKIPPED_UNSUPPORTED: NOTIFICATION_SEVERITY.INFO,
  RATE_LIMITED: NOTIFICATION_SEVERITY.ERROR,
  ERROR: NOTIFICATION_SEVERITY.ERROR,
};

/** §7.7: именно эти исходы превращают сводку в Alert severity="warning". */
export const SYNC_PROBLEM_OUTCOMES = [SYNC_OUTCOME.RATE_LIMITED, SYNC_OUTCOME.ERROR] as const;

export const SYNC_SUMMARY_SEPARATOR = ' · ';
export const SYNC_SUMMARY_VALUE_SEPARATOR = ' ';
export const SYNC_SUMMARY_CHECKED_LABEL = 'Проверено';
export const SYNC_SUMMARY_CLOSED_LABEL = 'закрыто';
export const SYNC_SUMMARY_ERRORS_LABEL = 'ошибок';
export const SYNC_SUMMARY_SKIPPED_LABEL = 'без источника';
export const SYNC_SUMMARY_SHOW_PROBLEMS_LABEL = 'Проблемные записи';
export const SYNC_SUMMARY_HIDE_PROBLEMS_LABEL = 'Скрыть';
export const SYNC_SUMMARY_DISMISS_LABEL = 'Скрыть сводку';
