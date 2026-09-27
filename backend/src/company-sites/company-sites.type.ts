import type { VacancySearchItem } from '../vacancies/vacancies.interfaces';

/** §4.14: результат загрузки HTML-страницы через CompanySiteHttpClient.getHtml. */
export type CompanySiteHtmlResult = { ok: true; html: string } | { ok: false; message: string };

/** §4.14: результат сбора всего списка вакансий компании (все страницы разом). */
export type CompanySiteListResult =
  { ok: true; items: VacancySearchItem[]; skippedInvalid: number } | { ok: false; message: string };

/** §4.14: результат одной страницы списка внутри collectPagedVacancies. */
export type CompanySitePageResult =
  | { ok: true; items: VacancySearchItem[]; skippedInvalid: number; hasMore: boolean }
  | { ok: false; message: string };

/** §4.14/Stage 3: результат загрузки JSON-тела через CompanySiteHttpClient.getJson. */
export type CompanySiteJsonResult = { ok: true; json: unknown } | { ok: false; message: string };

/**
 * §4.14/Stage 3: общая форма успех/неудача-результата CompanySiteHttpClient.request —
 * getHtml/getJson параметризуют её своим TSuccess (html: string / json: unknown), не
 * дублируя ветку неудачи ({ ok: false; message }), которая у обоих одинакова.
 */
export type CompanySiteFetchResult<TSuccess> =
  ({ ok: true } & TSuccess) | { ok: false; message: string };
