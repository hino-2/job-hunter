export const DODO_PARSER_KEY = 'dodo';

export const DODO_HOST_PATTERN = /^(www\.)?dodoteam\.ru$/;

export const DODO_API_BASE_URL = 'https://job-site-backend.dodo-ai-platform.io';
export const DODO_LIST_PATH = '/api/v1/vacancies';

/**
 * §4.14/Stage 3: живая проверка 2026-09-27 нашла реальный JSON-эндпоинт описания —
 * dodoteam.ru — Nuxt SPA без SSR (data-ssr="false", HTML-оболочка страницы
 * /vacancy пустая), но её компонент (chunk CmabtL9t.js) сам тянет
 * `${apiURL}/api/v1/pages/vacancy/{id}`, apiURL = window.__NUXT__.config.public.apiURL
 * = DODO_API_BASE_URL. Блюпринтовый HTML-фолбэк (getHtml + extractPageText) не
 * понадобился — этот эндпоинт отдаёт содержательный JSON напрямую.
 */
export const DODO_DETAIL_PATH = '/api/v1/pages/vacancy';

export const DODO_SITE_BASE_URL = 'https://dodoteam.ru';

/**
 * §4.14/Stage 3: человеческая ссылка — не /vacancy/{id} (путь без сегмента-id),
 * а /vacancy?vacancyId={id} (query-параметр) — так строит ссылку сам список
 * вакансий сайта (chunk BfoWghpJ.js: `to:{path:"/vacancy",query:{vacancyId:r.id}}`).
 */
export const DODO_VACANCY_PATH = '/vacancy';
export const DODO_VACANCY_ID_QUERY_PARAM = 'vacancyId';

export const DODO_FIELD = {
  DATA: 'data',
  ITEMS: 'items',
  SUBSPECIALITY: 'subspeciality',
  ID: 'id',
  POSITION: 'position',
  VACANCY_LOCATION: 'vacancy_location',
  PAGE: 'page',
  CONTENT: 'content',
  TYPE: 'type',
  TEXT: 'text',
} as const;

/**
 * §4.14/Stage 3: разделы content[], несущие текст описания вакансии (живая проверка
 * 2026-09-27 — id=14787). feedback_form/interview/vacancy_similar/vacancy_main
 * умышленно исключены: это форма отклика, шаги собеседования и похожие вакансии,
 * а не текст самой вакансии.
 */
export const DODO_DESCRIPTION_CONTENT_TYPES: readonly string[] = [
  'vacancy_text',
  'vacancy_expectation',
  'vacancy_you_will',
  'vacancy_benefits',
];

export const DODO_NOT_LIST_MESSAGE = 'Ответ dodoteam.ru не список вакансий';
export const DODO_VACANCY_ID_MISSING_MESSAGE =
  'Не удалось определить id вакансии dodoteam.ru по ссылке';
