/**
 * Колбэки исхода POST /api/vacancy-leads/scan (§7.9.2). 409 — штатное «прогон уже идёт»,
 * а не сбой, поэтому у него отдельный колбэк, не onFailed.
 */
export interface StartVacancyScanOptions {
  onAlreadyRunning: () => void;
  onFailed: (error: Error) => void;
}
