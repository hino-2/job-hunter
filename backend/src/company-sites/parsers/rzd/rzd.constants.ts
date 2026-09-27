export const RZD_PARSER_KEY = 'rzd';

export const RZD_HOST_PATTERN = /^team\.rzd\.ru$/;

export const RZD_API_BASE_URL = 'https://team.rzd.ru';
export const RZD_LIST_PATH = '/api/v1/career/vacancies';
export const RZD_DETAIL_PATH = '/api/v1/career/vacancies';

export const RZD_SITE_BASE_URL = 'https://team.rzd.ru';
export const RZD_VACANCY_PATH = '/career/vacancies';
export const RZD_VACANCY_PATH_PATTERN = /\/career\/vacancies\/(\d+)/;

/**
 * §4.14/Stage 3: direction_id=4 — «Информационные технологии и инновации» (живая
 * проверка 2026-09-27: 13 вакансий на всю выборку), per_page=100 укладывает их в
 * одну страницу, но параметр page всё равно передаётся — meta.pages у источника
 * растёт вместе с числом вакансий.
 */
export const RZD_DIRECTION_ID_PARAM = 'direction_id';
export const RZD_DIRECTION_ID_VALUE = '4';
export const RZD_PER_PAGE_PARAM = 'per_page';
export const RZD_PER_PAGE_VALUE = '100';
export const RZD_PAGE_PARAM = 'page';
export const RZD_FIRST_PAGE_NUMBER = 1;

export const RZD_FIELD = {
  DATA: 'data',
  META: 'meta',
  PAGE: 'page',
  PAGES: 'pages',
  ID: 'id',
  POSITION_TITLE: 'position_title',
  PUBLISHED_AT: 'published_at',
  LOCALITY_NAME: 'locality_name',
  SALARY_FROM: 'salary_from',
  SALARY_TO: 'salary_to',
  DESCRIPTION: 'description',
  RESPONSIBILITIES: 'responsibilities',
  REQUIREMENTS: 'requirements',
  CONDITIONS: 'conditions',
} as const;

export const RZD_NOT_LIST_MESSAGE = 'Ответ team.rzd.ru не список вакансий';
export const RZD_VACANCY_ID_MISSING_MESSAGE =
  'Не удалось определить id вакансии team.rzd.ru по ссылке';
