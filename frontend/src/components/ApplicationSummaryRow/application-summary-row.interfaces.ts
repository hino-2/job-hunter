import type { Application } from '../../types/application.interfaces';

export interface ApplicationSummaryRowProps {
  application: Application;
  /** §7.6: у этой записи /sync в полёте — спиннер вместо иконки, кнопка disabled. */
  isSyncing: boolean;
  onSync: (id: string) => void;
  /** Кнопка «Отказ компании»: сразу пишет result = REJECTED_BY_COMPANY (§7.3). */
  onRejectByCompany: (id: string) => void;
}
