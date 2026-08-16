import {
  HH_ALLOWED_HOST_PATTERN,
  HH_SEARCH_PAGE_PLACEHOLDER,
  HH_SEARCH_TEXT_PLACEHOLDER,
  HH_SEARCH_URL_ALLOWED_PROTOCOL,
  HH_SEARCH_URL_PAGE_PLACEHOLDER_PATTERN,
  HH_SEARCH_URL_TEXT_PLACEHOLDER_PATTERN,
} from './hh.constants';

/**
 * §4.11.1: подстановка плейсхолдеров шаблона ссылки на выдачу hh.ru. {text} —
 * через encodeURIComponent (поисковая строка из настроек может содержать пробелы
 * и спецсимволы), {page} — числом без кодирования. Итог — абсолютный URL (шаблон
 * содержит схему и хост, в дефолте региональный ekaterinburg.hh.ru, §4.11.1), поэтому
 * axios.get(url) с ним игнорирует baseURL HttpService и идёт по нему напрямую.
 *
 * Наличие обоих плейсхолдеров и https-хост hh.ru проверены при PUT
 * (vacancy-search/dto/update-vacancy-search-settings.dto.ts, §5.7) и повторно
 * fail-loud при чтении снимка настроек на старте прогона
 * (VacancySearchSettingsService.getSnapshot) — здесь достаточно String.replace
 * без повторной валидации.
 */
export function buildHhSearchUrl(template: string, searchText: string, page: number): string {
  return template
    .replace(HH_SEARCH_TEXT_PLACEHOLDER, encodeURIComponent(searchText))
    .replace(HH_SEARCH_PAGE_PLACEHOLDER, String(page));
}

/** §5.7: оба плейсхолдера обязаны присутствовать в сыром шаблоне (до подстановки). */
export function hasHhSearchUrlPlaceholders(template: string): boolean {
  return (
    HH_SEARCH_URL_TEXT_PLACEHOLDER_PATTERN.test(template) &&
    HH_SEARCH_URL_PAGE_PLACEHOLDER_PATTERN.test(template)
  );
}

/**
 * §5.7: шаблон обязан быть абсолютным https://-адресом с хостом из allow-list hh.ru.
 * Проверяется СЫРОЙ шаблон, без подстановки {text}/{page} — иначе шаблон вида
 * `https://{text}.hh.ru/…` мог бы протащить произвольный хост, управляемый строкой
 * поиска, мимо этой проверки (SSRF). new URL() внутри try/catch — невалидная строка
 * (в т.ч. без схемы) не считается допустимым происхождением. Никогда не бросает.
 */
export function isAllowedHhSearchUrlOrigin(template: string): boolean {
  try {
    const url = new URL(template);

    return url.protocol === HH_SEARCH_URL_ALLOWED_PROTOCOL && HH_ALLOWED_HOST_PATTERN.test(url.hostname);
  } catch {
    return false;
  }
}
