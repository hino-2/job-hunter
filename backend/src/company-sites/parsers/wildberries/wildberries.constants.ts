export const WILDBERRIES_PARSER_KEY = 'wildberries';

export const WILDBERRIES_HOST_PATTERN = /^career\.rwb\.ru$/;

export const WILDBERRIES_API_BASE_URL = 'https://career.rwb.ru';
export const WILDBERRIES_LIST_PATH = '/hr-crm-api/api/v2/pub/vacancies';
export const WILDBERRIES_DETAIL_PATH = '/hr-crm-api/api/v2/pub/vacancies';

export const WILDBERRIES_SITE_BASE_URL = 'https://career.rwb.ru';
export const WILDBERRIES_VACANCY_PATH = '/vacancies';
export const WILDBERRIES_VACANCY_PATH_PATTERN = /\/vacancies\/(\d+)/;

export const WILDBERRIES_LIMIT = 50;

/**
 * §4.14/Stage 3: живая проверка 2026-09-27 подтвердила, что direction_ids[]=3
 * («Разработка») фильтрует выдачу, а direction_id=3 (без квадратных скобок) — нет.
 * URL строится литеральной строкой (не через URLSearchParams.set), потому что тот
 * кодирует [] в %5B%5D — с закодированной формой источник тоже не фильтрует.
 */
export const WILDBERRIES_DIRECTION_IDS_PARAM = 'direction_ids[]';
export const WILDBERRIES_DIRECTION_ID_VALUE = '3';

export const WILDBERRIES_FIELD = {
  DATA: 'data',
  ITEMS: 'items',
  RANGE: 'range',
  COUNT: 'count',
  ID: 'id',
  NAME: 'name',
  CITY_TITLE: 'city_title',
  DESCRIPTION: 'description',
  DUTIES: 'duties',
  REQUIREMENTS: 'requirements',
  CONDITIONS: 'conditions',
} as const;

export const WILDBERRIES_NOT_LIST_MESSAGE = 'Ответ career.rwb.ru не список вакансий';
export const WILDBERRIES_VACANCY_ID_MISSING_MESSAGE =
  'Не удалось определить id вакансии career.rwb.ru по ссылке';
