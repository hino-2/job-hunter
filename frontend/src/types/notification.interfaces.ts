import type { NotificationSeverity } from './notification.type';

/**
 * Одно сообщение Snackbar'а (§7.3). id — счётчик, а не хеш текста: он уходит в React-key,
 * поэтому два одинаковых сообщения подряд заново открывают уже закрывшийся Snackbar.
 */
export interface AppNotification {
  id: number;
  text: string;
  severity: NotificationSeverity;
}
