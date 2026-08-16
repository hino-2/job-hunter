/**
 * Колбэки исхода POST /api/vacancy-leads/scan (§7.9.2, §4.11.12). 409 — штатный исход
 * (прогон уже идёт, либо для RESUME — валидной сохранённой позиции нет), а не сбой,
 * поэтому у него отдельный колбэк, не onFailed; сообщение приходит от сервера (§5.7) —
 * оно уже различает обе причины человеческим текстом.
 */
export interface StartVacancyScanOptions {
  onAlreadyRunning: (message: string) => void;
  onFailed: (error: Error) => void;
}
