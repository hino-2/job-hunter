import type { InlineEditHandlers } from '../hooks/use-inline-edits.interfaces';
import type { Application } from '../types/application.interfaces';
import type { EditableField, PendingTextValues } from '../types/application.type';

export interface ApplicationAccordionProps {
  application: Application;
  /** Срез черновиков по этой записи, а не весь словарь: только так работает memo. */
  pending: PendingTextValues;
  savedFields: ReadonlySet<EditableField>;
  handlers: InlineEditHandlers;
  expanded: boolean;
  onToggle: (id: string, expanded: boolean) => void;
  /** §7.6: у этой записи /sync в полёте — спиннер вместо иконки в шапке. */
  isSyncing: boolean;
  onSync: (id: string) => void;
  onDelete?: (id: string) => void;
}
