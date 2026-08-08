import { HH_VACANCY_ID_COLUMN_LENGTH } from '../applications/applications.constants';
import { EMPTY_STRING } from '../common/common.constants';
import {
  HH_ALLOWED_HOST_PATTERN,
  HH_ALLOWED_PROTOCOLS,
  HH_DEFAULT_SCHEME,
  HH_VACANCY_ID_GROUP,
  HH_VACANCY_PATH_PATTERN,
  URL_SCHEME_PATTERN,
} from './hh.constants';

/** new URL бросает на невалидной строке, а парсер обязан возвращать null (§4.2). */
function toUrlOrNull(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

/**
 * Извлекает vacancy_id из ссылки на вакансию hh.ru (§4.2).
 *
 * Это чистая функция, а не @Injectable-сервис, намеренно: её вызывает и модуль hh
 * (preview, §5.3), и applications.service (§4.2 — hh_vacancy_id вычисляется при
 * каждой записи vacancy_url). Зависимостей у парсера нет, DI ему ничего не даёт,
 * а провайдер обязывал бы каждого вызывающего тянуть за собой модуль.
 *
 * Никогда не бросает: любой мусор на входе — это null, а не 500.
 */
export function parseHhVacancyId(rawUrl: string | null | undefined): string | null {
  if (typeof rawUrl !== 'string') {
    return null;
  }

  const trimmed = rawUrl.trim();

  if (trimmed === EMPTY_STRING) {
    return null;
  }

  // «hh.ru/vacancy/123» без схемы считаем https (§4.2). Строку со схемой не трогаем,
  // иначе «mailto:…» превратился бы в «https://mailto:…» и прошёл бы проверку хоста.
  const normalized = URL_SCHEME_PATTERN.test(trimmed) ? trimmed : `${HH_DEFAULT_SCHEME}${trimmed}`;
  const url = toUrlOrNull(normalized);

  if (url === null) {
    return null;
  }

  if (!HH_ALLOWED_PROTOCOLS.includes(url.protocol)) {
    return null;
  }

  if (!HH_ALLOWED_HOST_PATTERN.test(url.hostname)) {
    return null;
  }

  // pathname уже без query и без фрагмента — «?from=…» и «#responses» отсекает сам URL.
  const match = HH_VACANCY_PATH_PATTERN.exec(url.pathname);
  const vacancyId = match?.[HH_VACANCY_ID_GROUP];

  if (vacancyId === undefined) {
    return null;
  }

  // Длина ограничена шириной колонки hh_vacancy_id: иначе /vacancy/<100 цифр>
  // сохранился бы в БД ошибкой драйвера, то есть 500 вместо штатного «не hh-вакансия».
  if (vacancyId.length > HH_VACANCY_ID_COLUMN_LENGTH) {
    return null;
  }

  return vacancyId;
}
