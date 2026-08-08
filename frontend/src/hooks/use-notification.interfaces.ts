import type { AppNotification } from '../types/notification.interfaces';
import type { NotificationSeverity } from '../types/notification.type';

/** Единственное уведомление на экране (§7.3): очереди сообщений спецификация не требует. */
export interface NotificationController {
  notification: AppNotification | null;
  notify: (text: string, severity: NotificationSeverity) => void;
  /** Отдельный ярлык: именно эту ссылку получает useInlineEdits, и она обязана быть стабильной. */
  notifyError: (text: string) => void;
  dismiss: () => void;
}
