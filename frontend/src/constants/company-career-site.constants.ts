import { COMPANY_MAX_LENGTH, URL_MAX_LENGTH } from './application.constants';

/**
 * Подписи и сообщения раздела «Сайты компаний» (§7.9, §4.14): собственная таблица
 * поверх CompanyCareerSite, а не Application, — отдельный набор констант вместо
 * переиспользования подписей application.constants.ts. Ограничения длины (§5.9)
 * совпадают с полями отклика (varchar(255)/varchar(2048)) — COMPANY_MAX_LENGTH
 * и URL_MAX_LENGTH переиспользуются напрямую из application.constants.ts, а не
 * дублируются здесь под новым именем (§10).
 */
export const COMPANY_CAREER_SITES_SECTION_TITLE = 'Сайты компаний';

export const COMPANY_CAREER_SITE_NAME_LABEL = 'Компания';
export const COMPANY_CAREER_SITE_URL_LABEL = 'Ссылка на вакансии';

/** §4.14: у строки без парсера показывается предупреждающая иконка с этой подсказкой. */
export const COMPANY_CAREER_SITE_PARSER_MISSING_TOOLTIP = 'Парсер не реализован';

export const COMPANY_CAREER_SITE_ADD_LABEL = 'Добавить';
export const COMPANY_CAREER_SITE_DELETE_LABEL = 'Удалить';

export const COMPANY_CAREER_SITE_NAME_REQUIRED_MESSAGE = 'Название обязательно';
export const COMPANY_CAREER_SITE_NAME_TOO_LONG_MESSAGE = `Не длиннее ${COMPANY_MAX_LENGTH} символов`;
export const COMPANY_CAREER_SITE_URL_REQUIRED_MESSAGE = 'Ссылка обязательна';
export const COMPANY_CAREER_SITE_URL_INVALID_MESSAGE = 'Некорректная ссылка';
export const COMPANY_CAREER_SITE_URL_TOO_LONG_MESSAGE = `Не длиннее ${URL_MAX_LENGTH} символов`;

export const COMPANY_CAREER_SITES_LOAD_ERROR_MESSAGE = 'Не удалось загрузить сайты компаний';
export const COMPANY_CAREER_SITE_CREATE_ERROR_FALLBACK_MESSAGE = 'Не удалось добавить сайт';
export const COMPANY_CAREER_SITE_UPDATE_ERROR_FALLBACK_MESSAGE = 'Не удалось сохранить изменения';
export const COMPANY_CAREER_SITE_DELETE_ERROR_FALLBACK_MESSAGE = 'Не удалось удалить сайт';

/**
 * Стабильная ссылка на пустой список (§10): литерал [] на месте использования
 * создавал бы новый массив каждый рендер и обнулял мемоизацию производных значений.
 */
export const EMPTY_COMPANY_CAREER_SITES: readonly [] = [];

export const COMPANY_CAREER_SITES_COUNT_PREFIX = ' (';
export const COMPANY_CAREER_SITES_COUNT_SUFFIX = ')';
