import type { ReactNode } from 'react';

export interface FieldCellProps {
  /** Значение из FIELD_FLEX — flex-basis поля по §7.2.2. */
  flex: string;
  isSaved: boolean;
  children: ReactNode;
}
