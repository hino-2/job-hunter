import type { ApplicationCreate } from '../../types/application.interfaces';

export interface CreateApplicationDialogProps {
  isSubmitting: boolean;
  onSubmit: (payload: ApplicationCreate) => void;
  onCancel: () => void;
  /** Сырая ошибка: текст и severity выбирает App (404 preview — не то же самое, что сбой). */
  onPreviewFailed: (error: Error) => void;
}
