import EventIcon from '@mui/icons-material/Event';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Tooltip,
  Typography,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { memo } from 'react';
import type { MouseEvent } from 'react';

import { APPLICATIONS_ENDPOINT } from '../../constants/api.constants';
import {
  APPLICATION_FIELD_LABELS,
  APPLICATION_RESULT,
  APPLICATION_RESULT_LABELS,
  APPLICATION_RESULT_ORDER,
  APPLICATION_STATUS,
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_ORDER,
  EMPTY_VALUE_PLACEHOLDER,
} from '../../constants/application.constants';
import {
  CONTROL_BLOCK_MARGIN_Y,
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
import type { ApplicationResult, ApplicationStatus } from '../../types/application.type';
import { selectUpcomingInterview } from '../../utils/application.utils';
import { buildCompanyInitial, buildCompanyLogoUrl } from '../../utils/company-logo.utils';
import { formatDateTimeFull, formatDateTimeShort } from '../../utils/date.utils';
import {
  RESULT_LABEL_ID_SUFFIX,
  STATUS_LABEL_ID_SUFFIX,
} from './application-summary-row.constants';
import type { ApplicationSummaryRowProps } from './application-summary-row.interfaces';
import { FieldCell } from '../FieldCell/FieldCell';
import { SyncStatusIcon } from '../SyncStatusIcon/SyncStatusIcon';

/**
 * Содержимое AccordionSummary — восемь элементов свёрнутой шапки (§7.2.1): чтение, две
 * кнопки действий и Select'ы «Статус» и «Результат». Только эти два контрола редактируемы —
 * поэтому они и гасят всплытие клика: клик по остальной шапке обязан переключать раскрытие.
 *
 * memo обязателен: шапка не зависит от `expanded` (поворот стрелки делает CSS-класс
 * на AccordionSummary, а не проп этого компонента), поэтому при переключении раскрытости
 * она обязана отбиваться memo, а не перерисовываться вместе с родительским Accordion.
 */
export const ApplicationSummaryRow = memo(function ApplicationSummaryRow({
  application,
  isStatusSaved,
  isResultSaved,
  handlers,
  isSyncing,
  onSync,
  onRejectByCompany,
}: ApplicationSummaryRowProps) {
  const isClosed = application.status === APPLICATION_STATUS.CLOSED;
  const statusLabelId = `${application.id}${STATUS_LABEL_ID_SUFFIX}`;
  const resultLabelId = `${application.id}${RESULT_LABEL_ID_SUFFIX}`;
  const upcoming = selectUpcomingInterview(application);
  const logoSrc = application.hasCompanyLogo
    ? buildCompanyLogoUrl(APPLICATIONS_ENDPOINT, application.id)
    : undefined;
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

  const handleStatusChange = (event: SelectChangeEvent<ApplicationStatus>) => {
    handlers.commit(application.id, { status: event.target.value });
  };

  const handleResultChange = (event: SelectChangeEvent<ApplicationResult>) => {
    handlers.commit(application.id, { result: event.target.value });
  };

  // Тот же §7.2.1, что и у кнопок: без гашения клик по Select — и по пункту его меню —
  // всплыл бы до AccordionSummary и переключил раскрытость. Портал MUI Menu от этого
  // не спасает: синтетическое событие идёт по дереву React, а не по DOM.
  const handleSelectClick = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  const handleRejectByCompany = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onRejectByCompany(application.id);
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
        my: CONTROL_BLOCK_MARGIN_Y,
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

      <FieldCell flex={SUMMARY_FLEX.status} isSaved={isStatusSaved}>
        <FormControl fullWidth size="small" onClick={handleSelectClick}>
          <InputLabel id={statusLabelId}>{APPLICATION_FIELD_LABELS.status}</InputLabel>
          <Select<ApplicationStatus>
            labelId={statusLabelId}
            label={APPLICATION_FIELD_LABELS.status}
            value={application.status}
            onChange={handleStatusChange}
          >
            {APPLICATION_STATUS_ORDER.map((status) => (
              <MenuItem key={status} value={status}>
                {APPLICATION_STATUS_LABELS[status]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </FieldCell>

      <FieldCell flex={SUMMARY_FLEX.result} isSaved={isResultSaved}>
        <FormControl fullWidth size="small" onClick={handleSelectClick}>
          <InputLabel id={resultLabelId}>{APPLICATION_FIELD_LABELS.result}</InputLabel>
          <Select<ApplicationResult>
            labelId={resultLabelId}
            label={APPLICATION_FIELD_LABELS.result}
            value={application.result}
            onChange={handleResultChange}
          >
            {APPLICATION_RESULT_ORDER.map((result) => (
              <MenuItem key={result} value={result}>
                {APPLICATION_RESULT_LABELS[result]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </FieldCell>

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

      {/*
       * Кнопка с подписью, как «Скрыть» у лидов (§7.9.1): действие частое, подпись читается
       * без наведения — поэтому Tooltip'а здесь нет. Обёртка со stopPropagation не нужна:
       * кнопка никогда не disabled, повторное нажатие гасит isNoopPatch в commit (§7.3).
       */}
      <Button
        variant="contained"
        onClick={handleRejectByCompany}
        sx={{ flex: SUMMARY_FLEX.auto }}
      >
        {APPLICATION_RESULT_LABELS[APPLICATION_RESULT.REJECTED_BY_COMPANY]}
      </Button>
    </Box>
  );
});
