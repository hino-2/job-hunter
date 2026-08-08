import type { Application } from '../types/application.interfaces';

export interface ApplicationSummaryRowProps {
  application: Application;
  /** §7.6: у этой записи /sync в полёте — спиннер вместо иконки, кнопка disabled. */
  isSyncing: boolean;
  onSync: (id: string) => void;
  onDelete?: (id: string) => void;
}
