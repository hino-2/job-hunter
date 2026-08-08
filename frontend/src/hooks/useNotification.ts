import { useCallback, useMemo, useRef, useState } from 'react';

import { FIRST_NOTIFICATION_ID, NOTIFICATION_SEVERITY } from '../constants/notification.constants';
import type { AppNotification } from '../types/notification.interfaces';
import type { NotificationSeverity } from '../types/notification.type';
import type { NotificationController } from './use-notification.interfaces';

/**
 * Состояние Snackbar'а (§7.3). Новое сообщение вытесняет предыдущее: очередь уведомлений
 * в однопользовательском приложении только задерживала бы показ актуального.
 *
 * Счётчик id живёт в ref, а не в состоянии: он не влияет на рендер, а лишний setState
 * на каждое уведомление давал бы вторую перерисовку.
 */
export function useNotification(): NotificationController {
  const [notification, setNotification] = useState<AppNotification | null>(null);
  const nextIdRef = useRef(FIRST_NOTIFICATION_ID);

  const notify = useCallback((text: string, severity: NotificationSeverity) => {
    const id = nextIdRef.current;

    nextIdRef.current += 1;
    setNotification({ id, text, severity });
  }, []);

  const notifyError = useCallback(
    (text: string) => {
      notify(text, NOTIFICATION_SEVERITY.ERROR);
    },
    [notify],
  );

  const dismiss = useCallback(() => {
    setNotification(null);
  }, []);

  return useMemo(
    () => ({ notification, notify, notifyError, dismiss }),
    [notification, notify, notifyError, dismiss],
  );
}
