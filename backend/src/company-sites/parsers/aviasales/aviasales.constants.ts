export const AVIASALES_PARSER_KEY = 'aviasales';

export const AVIASALES_HOST_PATTERN = /^(www\.)?aviasales\.ru$/;

/**
 * §4.14/Stage 3: живая проверка 2026-09-27 (curl -A "Mozilla/5.0 job-hunter/1.0"
 * -H "Accept: application/json") — один вызов возвращает JSON-массив всех открытых
 * вакансий (27 штук в выборке), пагинации нет вовсе.
 */
export const AVIASALES_LIST_URL = 'https://vacancies-app.aviasales.ru/api/vacancies';

/**
 * §4.14/Stage 3: без ?language=ru эндпоинт отвечает пустым 200-телом (проверено
 * живьём) — параметр обязателен, а не косметика локализации.
 */
export const AVIASALES_DETAIL_URL_BASE = 'https://vacancies-app.aviasales.ru/api/vacancies/vacancy';
export const AVIASALES_DETAIL_LANGUAGE_PARAM = 'language';
export const AVIASALES_DETAIL_LANGUAGE_VALUE = 'ru';

export const AVIASALES_SITE_BASE_URL = 'https://www.aviasales.ru';
export const AVIASALES_VACANCY_PATH = '/about/vacancies';

/** id вакансии в человеческом URL — единственный способ узнать его в fetchDescription(item). */
export const AVIASALES_VACANCY_PATH_PATTERN = /\/about\/vacancies\/(\d+)/;

export const AVIASALES_FIELD = {
  ID: 'id',
  POSITION: 'position',
  WORK_PLACE: 'workPlace',
  DESCRIPTION: 'description',
} as const;

export const AVIASALES_NOT_LIST_MESSAGE = 'Ответ aviasales не список вакансий';
export const AVIASALES_VACANCY_ID_MISSING_MESSAGE =
  'Не удалось определить id вакансии aviasales по ссылке';
