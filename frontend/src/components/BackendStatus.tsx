import { Chip } from '@mui/material';

import type { BackendStatusProps } from './backend-status.interfaces';

/** Индикатор в AppBar: подтверждает, что фронт достаёт бэкенд, а бэкенд — базу. */
export function BackendStatus({ isPending, isError, databaseUp }: BackendStatusProps) {
  if (isPending) {
    return <Chip label="Проверяем бэкенд…" />;
  }

  if (isError) {
    return <Chip color="error" label="Бэкенд недоступен" />;
  }

  if (!databaseUp) {
    return <Chip color="warning" label="БД недоступна" />;
  }

  return <Chip color="success" label="API и БД на связи" />;
}
