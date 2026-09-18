import {
  GEEKJOB_ALLOWED_HOST_PATTERN,
  GEEKJOB_FIRST_PAGE_NUMBER,
  GEEKJOB_SEARCH_JSON_PATH,
  GEEKJOB_SEARCH_PAGE_PLACEHOLDER,
  GEEKJOB_SEARCH_URL_ALLOWED_PROTOCOL,
  GEEKJOB_SEARCH_URL_PAGE_PLACEHOLDER_PATTERN,
} from './geekjob.constants';

/**
 * §4.11.1/§4.13: подстановка {page} в пользовательский шаблон ссылки на выдачу
 * geekjob.ru, затем подмена pathname на внутренний JSON-эндпоинт выдачи
 * (/json/find/vacancy) — сама страница /vacancies рендерится клиентским Vue и
 * содержит пустой список (§4.13). Шаблон, который вводит пользователь, остаётся
 * user-facing ссылкой (.../vacancies?rm=1&qs=node&page={page}), чтобы UX совпадал с
 * hh.ru/it-vacancies.ru — подмена пути происходит только на этом шаге, query-строка
 * (поисковый запрос и фильтры) сохраняется как есть.
 *
 * Страницы источника нумеруются с единицы, цикл прогона — с нуля, поэтому
 * подставляется page + GEEKJOB_FIRST_PAGE_NUMBER.
 *
 * Наличие {page} и https-хоста geekjob.ru проверены при PUT
 * (vacancy-search/dto/update-vacancy-search-settings.dto.ts, §5.7) и повторно
 * fail-loud при чтении снимка настроек на старте прогона — здесь достаточно
 * String.replace и new URL без повторной валидации происхождения.
 */
export function buildGeekjobSearchUrl(template: string, page: number): string {
  const substituted = template.replace(
    GEEKJOB_SEARCH_PAGE_PLACEHOLDER,
    String(page + GEEKJOB_FIRST_PAGE_NUMBER),
  );

  const url = new URL(substituted);

  url.pathname = GEEKJOB_SEARCH_JSON_PATH;

  return url.toString();
}

/** §5.7: {page} обязан присутствовать в сыром шаблоне (до подстановки). */
export function hasGeekjobSearchPagePlaceholder(template: string): boolean {
  return GEEKJOB_SEARCH_URL_PAGE_PLACEHOLDER_PATTERN.test(template);
}

/**
 * §5.7: шаблон обязан быть абсолютным https://-адресом с хостом из allow-list
 * geekjob.ru. Проверяется СЫРОЙ шаблон, до подстановки {page} и до подмены
 * pathname — иначе шаблон вида `https://{page}.evil.tld/…` мог бы протащить
 * произвольный хост мимо этой проверки (SSRF). new URL() внутри try/catch —
 * невалидная строка (в т.ч. без схемы) не считается допустимым происхождением.
 * Никогда не бросает.
 */
export function isAllowedGeekjobSearchUrlOrigin(template: string): boolean {
  try {
    const url = new URL(template);

    return (
      url.protocol === GEEKJOB_SEARCH_URL_ALLOWED_PROTOCOL &&
      GEEKJOB_ALLOWED_HOST_PATTERN.test(url.hostname)
    );
  } catch {
    return false;
  }
}
