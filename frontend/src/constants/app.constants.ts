import type { AppTab } from '../types/app.type';

/**
 * Вкладки шелла (§7.9). Роутера в проекте нет и не заводится — активная вкладка обычный
 * useState в App.tsx, без персистентности между перезагрузками (то же правило, что и у
 * раскрытости аккордеонов, §12).
 */
export const APP_TAB = {
  APPLICATIONS: 'applications',
  VACANCIES: 'vacancies',
} as const;

export const APP_TAB_LABELS: Record<AppTab, string> = {
  applications: 'Отклики',
  vacancies: 'Вакансии',
};

export const DEFAULT_APP_TAB: AppTab = APP_TAB.APPLICATIONS;

export const APP_TABS_ARIA_LABEL = 'Разделы приложения';
