import type { HhSearchPage } from './hh.interfaces';

/**
 * Результаты обращений HhSearchService (§4.11.2–4.11.3, §4.11.7). Дискриминант —
 * `ok`, а не `outcome` из §4.5: сбой поиска не пишется в applications.last_sync_outcome,
 * это отдельный от синхронизации конвейер (§4.11), значения SyncOutcome тут неуместны.
 */
export type HhSearchPageResult = { ok: true; page: HhSearchPage } | { ok: false; message: string };

/**
 * §4.11.7, §4.10 (шаг №26 §14): описание уже приведено к plain text
 * (common/html.helpers.ts), не обрезано. logoUrl/logoAllowedHostPattern — тот же
 * логотип компании, что и у синхронизации (Vacancy.logoUrl): страница вакансии здесь
 * уже загружена ради описания, поэтому её же HTML разбирается и на логотип, без
 * лишнего сетевого запроса. Пара заполняется вместе, как и в Vacancy — logoUrl без
 * allow-list'а не бывает.
 */
export type HhDescriptionResult =
  | { ok: true; description: string; logoUrl: string | null; logoAllowedHostPattern: RegExp | null }
  | { ok: false; message: string };
