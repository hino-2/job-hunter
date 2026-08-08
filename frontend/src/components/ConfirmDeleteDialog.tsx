import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Typography,
} from '@mui/material';

import { CONFIRM_DELETE_DIALOG_MAX_WIDTH } from './confirm-delete-dialog.constants';
import type { ConfirmDeleteDialogProps } from './confirm-delete-dialog.interfaces';

/**
 * Подтверждение удаления (§7.5, §13.9): компания и должность — в тексте предупреждения,
 * чтобы случайный клик по 🗑 не стал необратимым удалением не той записи.
 *
 * Монтируется условно из App, а не держит open=false: диалог удаления существует ровно
 * тогда, когда есть цель удаления (App.tsx, deleteTarget).
 */
export function ConfirmDeleteDialog({
  application,
  isDeleting,
  onConfirm,
  onCancel,
}: ConfirmDeleteDialogProps) {
  const handleClose = () => {
    // Пока запрос летит, закрытие (Esc/backdrop) игнорируется — иначе диалог исчезнет,
    // а решение об исходе останется неозвученным.
    if (isDeleting) {
      return;
    }

    onCancel();
  };

  const handleConfirm = () => {
    onConfirm(application.id);
  };

  return (
    <Dialog open fullWidth maxWidth={CONFIRM_DELETE_DIALOG_MAX_WIDTH} onClose={handleClose}>
      <DialogTitle>Удалить запись?</DialogTitle>

      <DialogContent>
        <DialogContentText>
          Запись будет удалена безвозвратно, отменить действие нельзя.
        </DialogContentText>

        <Typography sx={{ fontWeight: 'bold' }}>{application.company}</Typography>

        {application.position !== null ? (
          <Typography color="text.secondary">{application.position}</Typography>
        ) : null}
      </DialogContent>

      <DialogActions>
        <Button autoFocus disabled={isDeleting} onClick={onCancel}>
          Отмена
        </Button>

        <Button color="error" variant="contained" disabled={isDeleting} onClick={handleConfirm}>
          Удалить
        </Button>
      </DialogActions>
    </Dialog>
  );
}
