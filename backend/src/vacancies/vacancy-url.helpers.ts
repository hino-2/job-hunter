import { EMPTY_STRING } from '../common/common.constants';
import {
  URL_SCHEME_PATTERN,
  VACANCY_ALLOWED_PROTOCOLS,
  VACANCY_DEFAULT_SCHEME,
} from './vacancies.constants';

/** new URL бросает на невалидной строке, а хелпер обязан возвращать null (§4.2). */
function toUrlOrNull(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

/**
 * Общая часть разбора пользовательской ссылки на вакансию (§4.2), от которой
 * зависят и hh-url.parser.ts, и getmatch-url.parser.ts: тримит строку, дописывает
 * https://, если схемы нет, и отбраковывает не-http(s) протоколы. Проверка хоста
 * и пути — специфична для каждого источника и остаётся в его собственном парсере.
 *
 * Чистая функция, без зависимостей: тот же принцип, что у hh-url.parser.ts —
 * DI ей ничего не даёт, а провайдер обязывал бы каждого вызывающего тянуть модуль.
 *
 * Никогда не бросает: любой мусор на входе — это null, а не исключение.
 */
export function normalizeVacancyUrl(rawUrl: string | null | undefined): URL | null {
  if (typeof rawUrl !== 'string') {
    return null;
  }

  const trimmed = rawUrl.trim();

  if (trimmed === EMPTY_STRING) {
    return null;
  }

  // «hh.ru/vacancy/123» без схемы считаем https (§4.2). Строку со схемой не трогаем,
  // иначе «mailto:…» превратился бы в «https://mailto:…» и прошёл бы проверку хоста.
  const normalized = URL_SCHEME_PATTERN.test(trimmed)
    ? trimmed
    : `${VACANCY_DEFAULT_SCHEME}${trimmed}`;
  const url = toUrlOrNull(normalized);

  if (url === null) {
    return null;
  }

  if (!VACANCY_ALLOWED_PROTOCOLS.includes(url.protocol)) {
    return null;
  }

  return url;
}
