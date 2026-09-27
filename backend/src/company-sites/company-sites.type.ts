import type { VacancySearchItem } from '../vacancies/vacancies.interfaces';

/** §4.14: результат загрузки HTML-страницы через CompanySiteHttpClient.getHtml. */
export type CompanySiteHtmlResult = { ok: true; html: string } | { ok: false; message: string };

/** §4.14: результат сбора всего списка вакансий компании (все страницы разом). */
export type CompanySiteListResult =
  | { ok: true; items: VacancySearchItem[]; skippedInvalid: number }
  | { ok: false; message: string };

/** §4.14: результат одной страницы списка внутри collectPagedVacancies. */
export type CompanySitePageResult =
  | { ok: true; items: VacancySearchItem[]; skippedInvalid: number; hasMore: boolean }
  | { ok: false; message: string };
