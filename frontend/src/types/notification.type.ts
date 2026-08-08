import type { NOTIFICATION_SEVERITY } from '../constants/notification.constants';

/** Серьёзность сообщения Snackbar (§7.3, §7.6) — значения совпадают с severity Alert. */
export type NotificationSeverity =
  (typeof NOTIFICATION_SEVERITY)[keyof typeof NOTIFICATION_SEVERITY];
