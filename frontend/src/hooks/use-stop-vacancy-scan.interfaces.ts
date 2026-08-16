/**
 * Колбэки исхода POST /api/vacancy-leads/scan/stop (§7.9.2, §4.11.12). 409 — штатное
 * «прогон уже завершён» (запрос на остановку опоздал), а не сбой, поэтому у него
 * отдельный колбэк, не onFailed.
 */
export interface StopVacancyScanOptions {
  onNotRunning: (message: string) => void;
  onFailed: (error: Error) => void;
}
