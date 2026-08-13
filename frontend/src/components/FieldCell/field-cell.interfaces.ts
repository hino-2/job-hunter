import type { ReactNode } from 'react';

export interface FieldCellProps {
  /** Значение из FIELD_FLEX — flex-basis поля по §7.2.2. */
  flex: string;
  /** Значение из FIELD_MAX_WIDTH: потолок ширины поля (§7.2.2). undefined — потолка нет. */
  maxWidth?: string;
  /** undefined — «не подсвечено»: диалог создания подсветку «сохранено» не показывает. */
  isSaved?: boolean;
  children: ReactNode;
}
