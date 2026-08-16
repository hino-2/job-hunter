/** §4.11.1: прогон не идёт дальше min(paging.lastPage.page, VACANCY_SCAN_MAX_PAGES - 1). */
export function resolveLastPageIndex(lastPage: number, maxPages: number): number {
  return Math.min(lastPage, maxPages - 1);
}

/**
 * «Всего страниц» индикатора прогресса (§4.11.11, §5.7): индекс последней известной
 * страницы + 1, либо весь бюджет VACANCY_SCAN_MAX_PAGES, пока hh.ru ещё не сообщил
 * lastPage (сразу после первого запроса значение неизвестно).
 */
export function resolveTotalPages(lastPageIndex: number | null, maxPages: number): number {
  return lastPageIndex === null ? maxPages : lastPageIndex + 1;
}
