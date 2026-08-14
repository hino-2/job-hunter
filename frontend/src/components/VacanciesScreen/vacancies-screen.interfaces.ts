import type { NotificationController } from '../../hooks/use-notification.interfaces';

/**
 * Пропы экрана «Вакансии» (§7.9). notification приходит из шелла (App.tsx) — Snackbar
 * на всё приложение один, чтобы уведомления откликов и вакансий не легли друг на друга
 * при одновременном показе (оба смонтированы разом, у обоих один anchorOrigin).
 */
export interface VacanciesScreenProps {
  notification: NotificationController;
}
