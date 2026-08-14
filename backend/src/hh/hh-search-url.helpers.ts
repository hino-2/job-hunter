import { HH_SEARCH_PAGE_PLACEHOLDER, HH_SEARCH_TEXT_PLACEHOLDER } from './hh.constants';

/**
 * §4.11.1: подстановка плейсхолдеров шаблона ссылки на выдачу hh.ru. {text} —
 * через encodeURIComponent (поисковая строка из настроек может содержать пробелы
 * и спецсимволы), {page} — числом без кодирования. Итог — абсолютный URL (шаблон
 * содержит схему и хост, в дефолте региональный ekaterinburg.hh.ru, §4.11.1), поэтому
 * axios.get(url) с ним игнорирует baseURL HttpService и идёт по нему напрямую.
 *
 * Наличие обоих плейсхолдеров в шаблоне проверено при старте процесса
 * (config/environment.validation.ts) — здесь достаточно String.replace без
 * повторной валидации.
 */
export function buildHhSearchUrl(template: string, searchText: string, page: number): string {
  return template
    .replace(HH_SEARCH_TEXT_PLACEHOLDER, encodeURIComponent(searchText))
    .replace(HH_SEARCH_PAGE_PLACEHOLDER, String(page));
}
