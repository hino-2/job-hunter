import {
  HH_ALLOWED_HOST_PATTERN,
  HH_SEARCH_PAGE_PLACEHOLDER,
  HH_SEARCH_URL_ALLOWED_PROTOCOL,
  HH_SEARCH_URL_PAGE_PLACEHOLDER_PATTERN,
} from './hh.constants';

/**
 * §4.11.1: подстановка единственного плейсхолдера шаблона ссылки на выдачу hh.ru —
 * {page}, числом без кодирования. Поисковый запрос уже часть шаблона (пользователь
 * вставляет готовую ссылку выдачи со своим text=…), поэтому больше ничего не
 * подставляется: любая другая похожая на плейсхолдер подстрока (в том числе
 * оставшийся с миграции {text}) уходит в hh.ru как есть, буквально.
 *
 * Итог — абсолютный URL (шаблон содержит схему и хост, в дефолте региональный
 * ekaterinburg.hh.ru, §4.11.1), поэтому axios.get(url) с ним игнорирует baseURL
 * HttpService и идёт по нему напрямую.
 *
 * Наличие {page} и https-хоста hh.ru проверены при PUT
 * (vacancy-search/dto/update-vacancy-search-settings.dto.ts, §5.7) и повторно
 * fail-loud при чтении снимка настроек на старте прогона
 * (VacancySearchSettingsService.getSnapshot) — здесь достаточно String.replace
 * без повторной валидации.
 */
export function buildHhSearchUrl(template: string, page: number): string {
  return template.replace(HH_SEARCH_PAGE_PLACEHOLDER, String(page));
}

/** §5.7: {page} обязан присутствовать в сыром шаблоне (до подстановки). */
export function hasHhSearchPagePlaceholder(template: string): boolean {
  return HH_SEARCH_URL_PAGE_PLACEHOLDER_PATTERN.test(template);
}

/**
 * §5.7: шаблон обязан быть абсолютным https://-адресом с хостом из allow-list hh.ru.
 * Проверяется СЫРОЙ шаблон, без подстановки {page} — иначе шаблон вида
 * `https://{page}.hh.ru/…` мог бы протащить произвольный хост мимо этой проверки
 * (SSRF). new URL() внутри try/catch — невалидная строка (в т.ч. без схемы) не
 * считается допустимым происхождением. Никогда не бросает.
 */
export function isAllowedHhSearchUrlOrigin(template: string): boolean {
  try {
    const url = new URL(template);

    return (
      url.protocol === HH_SEARCH_URL_ALLOWED_PROTOCOL && HH_ALLOWED_HOST_PATTERN.test(url.hostname)
    );
  } catch {
    return false;
  }
}
