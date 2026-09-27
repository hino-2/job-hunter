export const KONTUR_PARSER_KEY = 'kontur';

export const KONTUR_HOST_PATTERN = /^(www\.)?kontur\.ru$/;

export const KONTUR_SITE_BASE_URL = 'https://kontur.ru';
export const KONTUR_LIST_PATH = '/career/vacancies';
export const KONTUR_PAGE_PARAM = 'page';
export const KONTUR_FIRST_PAGE_NUMBER = 1;

/**
 * §4.14: живая проверка 2026-09-27 (curl -A "Mozilla/5.0 job-hunter/1.0"
 * https://kontur.ru/career/vacancies?page=1) — реальная разметка:
 * `<a class="vacancy" href="/career/vacancies/5818" data-event-name="…">…</a>`.
 * Навигационные пункты меню используют ту же основу пути ('/career/vacancies/conditions',
 * '/career/vacancies/recommend'), но с одинарными кавычками у href и без class="vacancy" —
 * поэтому якорь ищется по обоим признакам разом, а не только по href.
 */
export const KONTUR_VACANCY_ANCHOR_PATTERN =
  /<a\s+class="vacancy"\s+href="\/career\/vacancies\/([A-Za-z0-9_-]+)"[^>]*>([\s\S]*?)<\/a>/gi;

/**
 * §4.14: живая проверка подтвердила, что название вакансии сидит в собственном
 * дочернем `<span class="vacancy__title">…</span>` внутри анкора, а следом идёт
 * `<div class="vacancy__description">` с городом/форматом работы — блюпринтовый
 * приём «схлопнуть суффикс-разделитель» заменён на прямое извлечение этого span'а:
 * он не зависит от количества &nbsp;/переводов строк вокруг бейджа «Новая».
 */
export const KONTUR_VACANCY_TITLE_SPAN_PATTERN =
  /<span\b[^>]*\bclass="vacancy__title"[^>]*>([\s\S]*?)<\/span>/i;
