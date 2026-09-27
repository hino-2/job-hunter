/**
 * Литералы модуля source-icons (§5.8): иконка сайта-источника вакансий, отдаваемая через
 * общий кэш logos/ (§4.10) вместо прямого обращения браузера к hh.ru/getmatch.ru/
 * it-vacancies.ru/geekjob.ru. Всё общее для источников уже описано в logos/ — здесь
 * только карты «источник → …» и маршрут.
 */

import {
  GEEKJOB_ALLOWED_HOST_PATTERN,
  GEEKJOB_SITE_BASE_URL_ENV_KEY,
} from '../geekjob/geekjob.constants';
import {
  GETMATCH_ALLOWED_HOST_PATTERN,
  GETMATCH_SITE_BASE_URL_ENV_KEY,
} from '../getmatch/getmatch.constants';
import { HH_LOGO_ALLOWED_HOST_PATTERN, HH_SITE_BASE_URL_ENV_KEY } from '../hh/hh.constants';
import {
  IT_VACANCIES_ALLOWED_HOST_PATTERN,
  IT_VACANCIES_SITE_BASE_URL_ENV_KEY,
} from '../it-vacancies/it-vacancies.constants';
import type { SourceIconSource } from './source-icon.type';

export const SOURCE_ICONS_ROUTE = 'vacancy-sources';

export const SOURCE_ICON_PARAM = 'source';

export const SOURCE_ICON_ROUTE = `:${SOURCE_ICON_PARAM}/icon`;

/**
 * Имя env-переменной с базовым URL сайта источника — берутся готовые константы модулей
 * источников (импорт значений, не DI): source-icons/ не тянет их модули целиком, поэтому
 * цикла зависимостей нет.
 */
export const SOURCE_SITE_BASE_URL_ENV_KEYS: Record<SourceIconSource, string> = {
  HH: HH_SITE_BASE_URL_ENV_KEY,
  GETMATCH: GETMATCH_SITE_BASE_URL_ENV_KEY,
  IT_VACANCIES: IT_VACANCIES_SITE_BASE_URL_ENV_KEY,
  GEEKJOB: GEEKJOB_SITE_BASE_URL_ENV_KEY,
};

/**
 * Путь до иконки на сайте источника. Одна и та же дорожка /favicon.ico у всех четырёх
 * сегодня — единственная точка правки, если источник переедет с классического favicon
 * (например, на <link rel="icon"> с другим путём).
 */
export const SOURCE_ICON_PATHS: Record<SourceIconSource, string> = {
  HH: '/favicon.ico',
  GETMATCH: '/favicon.ico',
  IT_VACANCIES: '/favicon.ico',
  GEEKJOB: '/favicon.ico',
};

/**
 * Allow-list хоста для скачивания иконки — переиспользует существующий allow-list
 * каждого источника (§4.2, §4.10). У hh.ru — логотипный (HH_LOGO_ALLOWED_HOST_PATTERN,
 * покрывает и hhcdn.ru): favicon может 3xx-нуть на CDN, а не только отдаться с самого
 * hh.ru.
 */
export const SOURCE_ICON_ALLOWED_HOST_PATTERNS: Record<SourceIconSource, RegExp> = {
  HH: HH_LOGO_ALLOWED_HOST_PATTERN,
  GETMATCH: GETMATCH_ALLOWED_HOST_PATTERN,
  IT_VACANCIES: IT_VACANCIES_ALLOWED_HOST_PATTERN,
  GEEKJOB: GEEKJOB_ALLOWED_HOST_PATTERN,
};

/**
 * §5.8: негативный кэш SourceIconService — час между повторными попытками скачать
 * иконку недоступного источника. Ниже acquireSlot/троттла (§4.11.2) не нужно: за весь
 * процесс на источник уходит максимум один запрос раз в час, никакой лимит частоты
 * этим не приближается.
 */
export const SOURCE_ICON_RETRY_AFTER_MS = 3_600_000;

export const SOURCE_ICON_UNAVAILABLE_MESSAGE = 'Иконка источника недоступна';

export const SOURCE_ICON_UNKNOWN_SOURCE_MESSAGE = 'Неизвестный источник вакансий';

export const SOURCE_ICON_DOWNLOAD_FAILED_MESSAGE = 'Иконка источника не скачана';
