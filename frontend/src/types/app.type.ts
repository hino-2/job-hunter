import type { APP_TAB } from '../constants/app.constants';

/** Активная вкладка шелла (§7.9): «Отклики», «HR-собес», «Тех-собес» либо «Вакансии». */
export type AppTab = (typeof APP_TAB)[keyof typeof APP_TAB];

/**
 * Вкладки экрана откликов (§7.9): все вкладки шелла, кроме «Вакансии» — у них общий
 * компонент ApplicationsScreen с разным initialFilters (APP_TAB_FILTERS), а «Вакансии»
 * рендерит отдельный VacanciesScreen.
 */
export type ApplicationsAppTab = Exclude<AppTab, typeof APP_TAB.VACANCIES>;
