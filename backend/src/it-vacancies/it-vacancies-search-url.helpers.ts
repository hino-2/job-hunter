import {
  IT_VACANCIES_ALLOWED_HOST_PATTERN,
  IT_VACANCIES_FIRST_PAGE_NUMBER,
  IT_VACANCIES_SEARCH_PAGE_PLACEHOLDER,
  IT_VACANCIES_SEARCH_URL_ALLOWED_PROTOCOL,
  IT_VACANCIES_SEARCH_URL_PAGE_PLACEHOLDER_PATTERN,
} from './it-vacancies.constants';

/**
 * §4.11.1: подстановка единственного плейсхолдера шаблона ссылки на выдачу
 * it-vacancies.ru — {page}, числом без кодирования. Поисковый запрос уже часть
 * шаблона (пользователь вставляет готовую ссылку выдачи со своим search_field=…),
 * поэтому больше ничего не подставляется.
 *
 * Отличие от buildHhSearchUrl: страницы источника нумеруются с единицы, а цикл
 * прогона — с нуля, поэтому подставляется page + IT_VACANCIES_FIRST_PAGE_NUMBER.
 * Иначе первая страница прогона запрашивалась бы как ?page=0.
 *
 * Наличие {page} и https-хоста it-vacancies.ru проверены при PUT
 * (vacancy-search/dto/update-vacancy-search-settings.dto.ts, §5.7) и повторно
 * fail-loud при чтении снимка настроек на старте прогона
 * (VacancySearchSettingsService.getSnapshot) — здесь достаточно String.replace
 * без повторной валидации.
 */
export function buildItVacanciesSearchUrl(template: string, page: number): string {
  return template.replace(
    IT_VACANCIES_SEARCH_PAGE_PLACEHOLDER,
    String(page + IT_VACANCIES_FIRST_PAGE_NUMBER),
  );
}

/** §5.7: {page} обязан присутствовать в сыром шаблоне (до подстановки). */
export function hasItVacanciesSearchPagePlaceholder(template: string): boolean {
  return IT_VACANCIES_SEARCH_URL_PAGE_PLACEHOLDER_PATTERN.test(template);
}

/**
 * §5.7: шаблон обязан быть абсолютным https://-адресом с хостом из allow-list
 * it-vacancies.ru. Проверяется СЫРОЙ шаблон, без подстановки {page} — иначе шаблон
 * вида `https://{page}.evil.tld/…` мог бы протащить произвольный хост мимо этой
 * проверки (SSRF). new URL() внутри try/catch — невалидная строка (в т.ч. без схемы)
 * не считается допустимым происхождением. Никогда не бросает.
 */
export function isAllowedItVacanciesSearchUrlOrigin(template: string): boolean {
  try {
    const url = new URL(template);

    return (
      url.protocol === IT_VACANCIES_SEARCH_URL_ALLOWED_PROTOCOL &&
      IT_VACANCIES_ALLOWED_HOST_PATTERN.test(url.hostname)
    );
  } catch {
    return false;
  }
}
