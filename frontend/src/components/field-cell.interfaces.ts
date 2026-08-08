import type { ReactNode } from 'react';

export interface FieldCellProps {
  /** Значение из FIELD_FLEX — flex-basis поля по §7.2.2. */
  flex: string;
  /** undefined — «не подсвечено»: диалог создания подсветку «сохранено» не показывает. */
  isSaved?: boolean;
  children: ReactNode;
}
