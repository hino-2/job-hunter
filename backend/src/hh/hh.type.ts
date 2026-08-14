import type { HhSearchPage } from './hh.interfaces';

/**
 * Результаты обращений HhSearchService (§4.11.2–4.11.3, §4.11.7). Дискриминант —
 * `ok`, а не `outcome` из §4.5: сбой поиска не пишется в applications.last_sync_outcome,
 * это отдельный от синхронизации конвейер (§4.11), значения SyncOutcome тут неуместны.
 */
export type HhSearchPageResult = { ok: true; page: HhSearchPage } | { ok: false; message: string };

/** §4.11.7: описание уже приведено к plain text (common/html.helpers.ts), не обрезано. */
export type HhDescriptionResult = { ok: true; description: string } | { ok: false; message: string };
