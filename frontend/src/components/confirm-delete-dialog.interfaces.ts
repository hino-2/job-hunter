import type { Application } from '../types/application.interfaces';

export interface ConfirmDeleteDialogProps {
  application: Application;
  isDeleting: boolean;
  onConfirm: (id: string) => void;
  onCancel: () => void;
}
