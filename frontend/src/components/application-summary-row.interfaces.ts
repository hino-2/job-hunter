import type { Application } from '../types/application.interfaces';

export interface ApplicationSummaryRowProps {
  application: Application;
  /** Колбэки появятся на шагах 9–10; кнопки кликабельны уже сейчас и гасят событие. */
  onSync?: (id: string) => void;
  onDelete?: (id: string) => void;
}
