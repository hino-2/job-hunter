export const X5_PARSER_KEY = 'x5';

export const X5_HOST_PATTERN = /^(www\.)?x5\.tech$/;

export const X5_SITE_BASE_URL = 'https://x5.tech';
export const X5_LIST_PATH = '/vacancy';
export const X5_PAGE_PARAM = 'page';
export const X5_FIRST_PAGE_NUMBER = 1;

/**
 * §4.14: живая проверка 2026-09-27 (curl -A "Mozilla/5.0 job-hunter/1.0"
 * https://x5.tech/vacancy?page=1) — реальная разметка (Next.js, CSS-модули с
 * хешированными классами вида VacanciesItem_title__iBYZP, поэтому по классу не
 * матчим — хеш меняется при пересборке фронтенда x5.tech):
 * `<a title="Senior Go developer" class="VacanciesItem_title__…" href="/vacancy/{uuid}">
 * Senior Go developer</a>` — innerHTML якоря уже чистый текст названия, без вложенных
 * тегов. ?page=2 отдал 10 других вакансий без пересечения с ?page=1 — пагинация реальна.
 */
export const X5_VACANCY_ANCHOR_PATTERN =
  /<a\b[^>]*\bhref="\/vacancy\/([0-9a-f-]{36})"[^>]*>([\s\S]*?)<\/a>/gi;
