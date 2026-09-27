export const HH_SEARCH_PARSER_KEY = 'hh-search';

/** §4.14/D9: только этот путь строки CompanyCareerSite распознаётся — обычная выдача hh.ru. */
export const HH_SEARCH_PARSER_SEARCH_PATH = '/search/vacancy';

export const HH_SEARCH_PARSER_PAGE_PARAM = 'page';
export const HH_SEARCH_PARSER_ORDER_PARAM = 'order_by';
export const HH_SEARCH_PARSER_ORDER_VALUE = 'publication_time';

export const HH_SEARCH_PARSER_NOT_SEARCH_URL_MESSAGE =
  'Ссылка сайта компании не похожа на страницу выдачи hh.ru (/search/vacancy)';
export const HH_SEARCH_PARSER_VACANCY_ID_MISSING_MESSAGE =
  'Не удалось определить id вакансии hh.ru по ссылке';
