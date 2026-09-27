export const MAGNIT_TECH_PARSER_KEY = 'magnit-tech';

export const MAGNIT_TECH_HOST_PATTERN = /^(www\.)?magnit\.tech$/;

export const MAGNIT_TECH_API_BASE_URL = 'https://magnit.tech';
export const MAGNIT_TECH_LIST_PATH = '/api/v1/vacancy';
export const MAGNIT_TECH_DETAIL_PATH = '/api/v1/vacancy';

export const MAGNIT_TECH_SITE_BASE_URL = 'https://magnit.tech';
export const MAGNIT_TECH_VACANCY_PATH = '/vacancies';
export const MAGNIT_TECH_VACANCY_PATH_PATTERN = /\/vacancies\/(\d+)/;

export const MAGNIT_TECH_PAGE_PARAM = 'page';
export const MAGNIT_TECH_FIRST_PAGE_NUMBER = 1;

export const MAGNIT_TECH_FIELD = {
  META: 'meta',
  HAS_MORE_PAGES: 'has_more_pages',
  RESULTS: 'results',
  ID: 'id',
  TITLE: 'title',
  LOCATION: 'location',
  DESCRIPTION: 'description',
} as const;

export const MAGNIT_TECH_NOT_LIST_MESSAGE = 'Ответ magnit.tech не список вакансий';
export const MAGNIT_TECH_VACANCY_ID_MISSING_MESSAGE =
  'Не удалось определить id вакансии magnit.tech по ссылке';
