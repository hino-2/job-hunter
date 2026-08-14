import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EventIcon from '@mui/icons-material/Event';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Avatar,
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import { memo } from 'react';
import type { MouseEvent } from 'react';

import {
  APPLICATION_RESULT_CHIP_COLORS,
  APPLICATION_RESULT_LABELS,
  APPLICATION_STATUS,
  APPLICATION_STATUS_LABELS,
  EMPTY_VALUE_PLACEHOLDER,
} from '../../constants/application.constants';
import {
  FIELD_GAP,
  SUMMARY_FLEX,
  SUMMARY_ICON_GAP,
  SUMMARY_LOGO_GAP,
  SUMMARY_LOGO_FONT_SIZE,
  SUMMARY_LOGO_SIZE_PX,
  SUMMARY_SYNC_PROGRESS_SIZE_PX,
  SUMMARY_TEXT_MIN_WIDTH_PX,
} from '../../constants/layout.constants';
import { SYNC_ROW_LABEL, SYNC_ROW_PENDING_LABEL } from '../../constants/sync.constants';
import {
  buildCompanyInitial,
  buildCompanyLogoUrl,
  selectUpcomingInterview,
} from '../../utils/application.utils';
import { formatDateTimeFull, formatDateTimeShort } from '../../utils/date.utils';
import type { ApplicationSummaryRowProps } from './application-summary-row.interfaces';
import { SyncStatusIcon } from '../SyncStatusIcon/SyncStatusIcon';

/**
 * Содержимое AccordionSummary — восемь элементов свёрнутой шапки (§7.2.1), только чтение
 * плюс две кнопки действий. Полей ввода здесь нет: клик по шапке обязан переключать
 * раскрытие, а не попадать в инпут.
 *
 * memo обязателен: шапка не зависит от `expanded` (поворот стрелки делает CSS-класс
 * на AccordionSummary, а не проп этого компонента), поэтому при переключении раскрытости
 * она обязана отбиваться memo, а не перерисовываться вместе с родительским Accordion.
 */
export const ApplicationSummaryRow = memo(function ApplicationSummaryRow({
  application,
  isSyncing,
  onSync,
  onDelete,
}: ApplicationSummaryRowProps) {
  const isClosed = application.status === APPLICATION_STATUS.CLOSED;
  const upcoming = selectUpcomingInterview(application);
  const logoSrc = application.hasCompanyLogo ? buildCompanyLogoUrl(application.id) : undefined;
  const initial = buildCompanyInitial(application.company);

  // stopPropagation обязателен (§7.2.1): без него клик по кнопке всплыл бы
  // до AccordionSummary и переключил раскрытость (§13.10.3).
  const handleSync = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onSync(application.id);
  };

  // MUI ставит отключённому IconButton pointer-events: none, и клик по нему провалился бы
  // в AccordionSummary мимо handleSync — гасим его уже на обёртке (§13.10.3).
  const handleSyncWrapperClick = (event: MouseEvent<HTMLSpanElement>) => {
    event.stopPropagation();
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
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: SUMMARY_LOGO_GAP,
          flex: SUMMARY_FLEX.company,
          minWidth: SUMMARY_TEXT_MIN_WIDTH_PX,
        }}
      >
        <Avatar
          variant="rounded"
          alt=""
          src={logoSrc}
          sx={{
            width: SUMMARY_LOGO_SIZE_PX,
            height: SUMMARY_LOGO_SIZE_PX,
            fontSize: SUMMARY_LOGO_FONT_SIZE,
            flex: SUMMARY_FLEX.auto,
          }}
        >
          {initial}
        </Avatar>

        <Tooltip title={application.company}>
          <Typography
            noWrap
            sx={{
              flex: SUMMARY_FLEX.companyText,
              minWidth: SUMMARY_TEXT_MIN_WIDTH_PX,
              fontWeight: 'bold',
              color: isClosed ? 'text.secondary' : 'text.primary',
            }}
          >
            {application.company}
          </Typography>
        </Tooltip>
      </Box>

      <Typography
        noWrap
        color="text.secondary"
        sx={{ flex: SUMMARY_FLEX.position, minWidth: SUMMARY_TEXT_MIN_WIDTH_PX }}
      >
        {application.position ?? EMPTY_VALUE_PLACEHOLDER}
      </Typography>

      <Chip label={formatDateTimeFull(application.createdAt)} sx={{ flex: SUMMARY_FLEX.auto }} />

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
          source={application.vacancySource}
        />
      </Box>

      <Tooltip title={isSyncing ? SYNC_ROW_PENDING_LABEL : SYNC_ROW_LABEL}>
        <Box
          component="span"
          onClick={handleSyncWrapperClick}
          sx={{ flex: SUMMARY_FLEX.auto, display: 'inline-flex' }}
        >
          <IconButton aria-label={SYNC_ROW_LABEL} disabled={isSyncing} onClick={handleSync}>
            {isSyncing ? (
              <CircularProgress size={SUMMARY_SYNC_PROGRESS_SIZE_PX} />
            ) : (
              <RefreshIcon fontSize="small" />
            )}
          </IconButton>
        </Box>
      </Tooltip>

      <Tooltip title="Удалить">
        <IconButton aria-label="Удалить" onClick={handleDelete} sx={{ flex: SUMMARY_FLEX.auto }}>
          <DeleteOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
});
