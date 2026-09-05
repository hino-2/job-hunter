import type { APP_TAB } from '../constants/app.constants';

/** Активная вкладка шелла (§7.9): «Отклики» либо «Вакансии». */
export type AppTab = (typeof APP_TAB)[keyof typeof APP_TAB];
