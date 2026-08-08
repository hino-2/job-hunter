import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EventIcon from '@mui/icons-material/Event';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Box, Chip, IconButton, Tooltip, Typography } from '@mui/material';
import type { MouseEvent } from 'react';

import {
  APPLICATION_RESULT_CHIP_COLORS,
  APPLICATION_RESULT_LABELS,
  APPLICATION_STATUS,
  APPLICATION_STATUS_LABELS,
  EMPTY_VALUE_PLACEHOLDER,
} from '../constants/application.constants';
import {
  FIELD_GAP,
  SUMMARY_FLEX,
  SUMMARY_ICON_GAP,
  SUMMARY_TEXT_MIN_WIDTH_PX,
} from '../constants/layout.constants';
import { selectUpcomingInterview } from '../utils/application.utils';
import { formatDateTimeShort } from '../utils/date.utils';
import type { ApplicationSummaryRowProps } from './application-summary-row.interfaces';
import { SyncStatusIcon } from './SyncStatusIcon';

/**
 * Содержимое AccordionSummary — восемь элементов свёрнутой шапки (§7.2.1), только чтение
 * плюс две кнопки действий. Полей ввода здесь нет: клик по шапке обязан переключать
 * раскрытие, а не попадать в инпут.
 */
export function ApplicationSummaryRow({
  application,
  onSync,
  onDelete,
}: ApplicationSummaryRowProps) {
  const isClosed = application.status === APPLICATION_STATUS.CLOSED;
  const upcoming = selectUpcomingInterview(application);

  // stopPropagation обязателен (§7.2.1): без него клик по кнопке всплыл бы
  // до AccordionSummary и переключил раскрытость (§13.10.3).
  const handleSync = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onSync?.(application.id);
  };

  const handleDelete = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onDelete?.(application.id);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: FIELD_GAP,
        flexWrap: 'wrap',
        width: '100%',
        minWidth: SUMMARY_TEXT_MIN_WIDTH_PX,
      }}
    >
      <Tooltip title={application.company}>
        <Typography
          noWrap
          sx={{
            flex: SUMMARY_FLEX.company,
            minWidth: SUMMARY_TEXT_MIN_WIDTH_PX,
            fontWeight: 'bold',
            color: isClosed ? 'text.secondary' : 'text.primary',
          }}
        >
          {application.company}
        </Typography>
      </Tooltip>

      <Typography
        noWrap
        color="text.secondary"
        sx={{ flex: SUMMARY_FLEX.position, minWidth: SUMMARY_TEXT_MIN_WIDTH_PX }}
      >
        {application.position ?? EMPTY_VALUE_PLACEHOLDER}
      </Typography>

      <Chip
        label={APPLICATION_STATUS_LABELS[application.status]}
        sx={{ flex: SUMMARY_FLEX.auto }}
      />

      <Chip
        color={APPLICATION_RESULT_CHIP_COLORS[application.result]}
        label={APPLICATION_RESULT_LABELS[application.result]}
        sx={{ flex: SUMMARY_FLEX.auto }}
      />

      {upcoming !== null ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: SUMMARY_ICON_GAP,
            flex: SUMMARY_FLEX.auto,
          }}
        >
          <EventIcon fontSize="small" color={upcoming.isSoon ? 'warning' : 'action'} />
          <Typography
            noWrap
            variant="body2"
            sx={{
              color: upcoming.isSoon ? 'warning.main' : 'text.secondary',
              fontWeight: upcoming.isSoon ? 'bold' : 'regular',
            }}
          >
            {formatDateTimeShort(upcoming.at)}
          </Typography>
        </Box>
      ) : null}

      <Box sx={{ display: 'flex', alignItems: 'center', flex: SUMMARY_FLEX.auto }}>
        <SyncStatusIcon
          outcome={application.lastSyncOutcome}
          lastSyncedAt={application.lastSyncedAt}
          lastSyncError={application.lastSyncError}
        />
      </Box>

      <Tooltip title="Обновить статус">
        <IconButton
          aria-label="Обновить статус"
          onClick={handleSync}
          sx={{ flex: SUMMARY_FLEX.auto }}
        >
          <RefreshIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Tooltip title="Удалить">
        <IconButton aria-label="Удалить" onClick={handleDelete} sx={{ flex: SUMMARY_FLEX.auto }}>
          <DeleteOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
