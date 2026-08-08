import type { AppNotification } from '../types/notification.interfaces';

export interface NotificationSnackbarProps {
  notification: AppNotification | null;
  onClose: () => void;
}
