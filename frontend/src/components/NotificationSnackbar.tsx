import { Alert, Snackbar } from '@mui/material';

import { SNACKBAR_ANCHOR_ORIGIN, SNACKBAR_AUTO_HIDE_MS } from '../constants/layout.constants';
import type { NotificationSnackbarProps } from './notification-snackbar.interfaces';

/**
 * Единственный Snackbar приложения: сейчас — ошибки автосейва (§7.3), дальше шаги 9–10
 * переиспользуют его как есть.
 *
 * key={notification.id} обязателен: без него повтор того же текста не переоткрыл бы
 * уже закрывшийся по autoHideDuration Snackbar, и вторая ошибка прошла бы незаметно.
 */
export function NotificationSnackbar({ notification, onClose }: NotificationSnackbarProps) {
  return (
    <Snackbar
      key={notification?.id}
      open={notification !== null}
      autoHideDuration={SNACKBAR_AUTO_HIDE_MS}
      anchorOrigin={SNACKBAR_ANCHOR_ORIGIN}
      onClose={onClose}
    >
      <Alert severity={notification?.severity} variant="filled" onClose={onClose}>
        {notification?.text}
      </Alert>
    </Snackbar>
  );
}
