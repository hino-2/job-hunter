import { Alert, Snackbar } from '@mui/material';

import { SNACKBAR_ANCHOR_ORIGIN, SNACKBAR_AUTO_HIDE_MS } from '../../constants/layout.constants';
import type { NotificationSnackbarProps } from './notification-snackbar.interfaces';

/**
 * Единственный Snackbar приложения (§7.3, §7.9): живёт в шелле (App.tsx), а оба экрана
 * получают нотификатор пропом одним стабильным объектом. Два независимых Snackbar
 * с одним SNACKBAR_ANCHOR_ORIGIN MUI не стекует — легли бы друг на друга.
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
