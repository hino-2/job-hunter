import {
  Alert,
  Button,
  Collapse,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import { useState } from 'react';

import { SYNC_OUTCOME_LABELS } from '../constants/application.constants';
import { FIELD_GAP, SYNC_SUMMARY_LIST_MAX_HEIGHT_PX } from '../constants/layout.constants';
import { NOTIFICATION_SEVERITY } from '../constants/notification.constants';
import {
  SYNC_SUMMARY_DISMISS_LABEL,
  SYNC_SUMMARY_HIDE_PROBLEMS_LABEL,
  SYNC_SUMMARY_SHOW_PROBLEMS_LABEL,
} from '../constants/sync.constants';
import { formatSyncSummaryText, selectSyncProblemItems } from '../utils/sync.utils';
import type { SyncSummaryAlertProps } from './sync-summary-alert.interfaces';

/**
 * Сводка массового прогона (§7.7): отдельный Alert в потоке страницы, а не Snackbar —
 * сводке нужны многострочный текст, раскрывающийся список и жизнь до явного закрытия,
 * а не автогасящийся тост (§7.3 умеет только одно короткое сообщение).
 *
 * isExpanded держится внутри компонента: снаружи никто не инициирует сворачивание
 * (в отличие от §13.10.7 у аккордеонов), поэтому memo здесь не нужен.
 */
export function SyncSummaryAlert({ summary, onDismiss }: SyncSummaryAlertProps) {
  const [isExpanded, setExpanded] = useState(false);
  const problems = selectSyncProblemItems(summary);
  const severity =
    problems.length > 0 ? NOTIFICATION_SEVERITY.WARNING : NOTIFICATION_SEVERITY.SUCCESS;

  const handleToggle = () => {
    setExpanded((previous) => !previous);
  };

  return (
    <Alert severity={severity} onClose={onDismiss} closeText={SYNC_SUMMARY_DISMISS_LABEL}>
      <Stack spacing={FIELD_GAP}>
        <Typography variant="body2">{formatSyncSummaryText(summary)}</Typography>

        {problems.length > 0 ? (
          <Stack spacing={FIELD_GAP}>
            <Button
              size="small"
              color="inherit"
              onClick={handleToggle}
              sx={{ alignSelf: 'flex-start' }}
            >
              {isExpanded
                ? SYNC_SUMMARY_HIDE_PROBLEMS_LABEL
                : `${SYNC_SUMMARY_SHOW_PROBLEMS_LABEL} (${problems.length})`}
            </Button>

            <Collapse in={isExpanded}>
              <List
                dense
                disablePadding
                sx={{ maxHeight: SYNC_SUMMARY_LIST_MAX_HEIGHT_PX, overflowY: 'auto' }}
              >
                {problems.map((item) => (
                  <ListItem key={item.id} disableGutters>
                    <ListItemText
                      primary={item.company}
                      secondary={item.message ?? SYNC_OUTCOME_LABELS[item.outcome]}
                    />
                  </ListItem>
                ))}
              </List>
            </Collapse>
          </Stack>
        ) : null}
      </Stack>
    </Alert>
  );
}
