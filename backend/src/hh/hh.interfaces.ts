/**
 * Формы данных поиска по hh.ru (§4.11.3), специфичные для этого источника. Общие
 * для всех источников формы (VacancySearchItem, VacancySearchPage,
 * VacancySearchPageRequest и результаты обращений) живут в vacancies/ — они
 * контракт VacancyLeadSearchProvider, а не деталь hh.ru.
 */

/**
 * §4.11.3 шаг 3: результат сужения unknown → провалидированное состояние страницы
 * выдачи, явными предикатами (isHhSearchState в hh-search.parser.ts). Отсутствие
 * vacancySearchResult/vacancies/paging — fail-loud (§4.11.3): исход ERROR, а не
 * «нашли 0 вакансий».
 *
 * paging типизирован как Record, а не разложен до lastPage.page: проверено на
 * живой выдаче (14.08.2026, text=fullstack&search_period=7, totalResults=175) —
 * при короткой пагинации (≤4 видимых страниц) hh.ru отдаёт `paging.lastPage: null`,
 * а не объект с page (тот встречается только при длинной пагинации, как в примере
 * §4.11.1 с totalResults≈180 и 39 страницами). Читает поле readLastPage в
 * hh-search.parser.ts — мягкая деградация в null, а не fail-loud: «сколько ещё
 * страниц» не обязательно для разбора текущей.
 */
export interface HhSearchState {
  vacancySearchResult: {
    vacancies: unknown[];
    paging: Record<string, unknown>;
  };
}
