import {
  APPLICATION_ORDER,
  DEFAULT_APPLICATION_FILTERS,
  STATUS_FILTER,
} from './application.constants';
import type { ApplicationsFilters } from '../types/application.interfaces';
import type { ApplicationsAppTab, AppTab } from '../types/app.type';

/**
 * Вкладки шелла (§7.9). Роутера в проекте нет и не заводится — активная вкладка обычный
 * useState в App.tsx, без персистентности между перезагрузками (то же правило, что и у
 * раскрытости аккордеонов, §12). «HR-собес» и «Тех-собес» — не отдельные экраны, а пресеты
 * фильтров поверх того же ApplicationsScreen (см. APP_TAB_FILTERS): импорт направлен
 * только сюда, application.constants.ts про вкладки не знает.
 */
export const APP_TAB = {
  APPLICATIONS: 'applications',
  HR_INTERVIEW: 'hrInterview',
  TECH_INTERVIEW: 'techInterview',
  VACANCIES: 'vacancies',
} as const;

/** Порядок вкладок Tabs (§7.9). */
export const APP_TAB_ORDER = [
  APP_TAB.APPLICATIONS,
  APP_TAB.HR_INTERVIEW,
  APP_TAB.TECH_INTERVIEW,
  APP_TAB.VACANCIES,
] as const;

export const APP_TAB_LABELS: Record<AppTab, string> = {
  applications: 'Отклики',
  hrInterview: 'HR-собес',
  techInterview: 'Тех-собес',
  vacancies: 'Вакансии',
};

export const DEFAULT_APP_TAB: AppTab = APP_TAB.VACANCIES;

export const APP_TABS_ARIA_LABEL = 'Разделы приложения';

/**
 * Фильтры, с которыми ApplicationsScreen открывается на каждой из своих вкладок (§7.9).
 * «HR-собес»/«Тех-собес» — фиксированный статус плюс сортировка по возрастанию
 * соответствующей даты собеседования: ближайшее собеседование должно быть видно первым.
 * App.tsx монтирует ApplicationsScreen с key={tab}, поэтому переключение вкладки всегда
 * даёт этот пресет, а не сохранённые от предыдущей вкладки фильтры.
 */
export const APP_TAB_FILTERS: Record<ApplicationsAppTab, ApplicationsFilters> = {
  applications: DEFAULT_APPLICATION_FILTERS,
  hrInterview: {
    status: STATUS_FILTER.HR_INTERVIEW,
    search: '',
    sort: 'hrInterviewAt',
    order: APPLICATION_ORDER.ASC,
  },
  techInterview: {
    status: STATUS_FILTER.TECH_INTERVIEW,
    search: '',
    sort: 'techInterviewAt',
    order: APPLICATION_ORDER.ASC,
  },
};
