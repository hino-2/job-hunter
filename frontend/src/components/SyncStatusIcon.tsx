import SyncOutlinedIcon from '@mui/icons-material/SyncOutlined';
import { Tooltip, Typography } from '@mui/material';

import {
  SYNC_ICON_COLOR_NEVER,
  SYNC_NEVER_LABEL,
  SYNC_OK_TOOLTIP_PREFIX,
  SYNC_OUTCOME,
  SYNC_OUTCOME_ICON_COLORS,
  SYNC_OUTCOME_ICONS,
  SYNC_OUTCOME_LABELS,
} from '../constants/application.constants';
import { formatDateTimeFull } from '../utils/date.utils';
import type { SyncStatusIconProps } from './sync-status-icon.interfaces';

/** Элемент 6 свёрнутой шапки (§7.2.1): статус последней синхронизации + tooltip. */
export function SyncStatusIcon({ outcome, lastSyncedAt, lastSyncError }: SyncStatusIconProps) {
  // Записи, которые ещё ни разу не синхронизировались, тоже занимают место в строке —
  // иначе колонка «прыгала» бы по ширине от записи к записи.
  // Обёртка span с tabIndex обязательна: сама SvgIcon фокус не принимает, и с клавиатуры
  // текст подсказки (в том числе lastSyncError) был бы недостижим.
  if (outcome === null) {
    return (
      <Tooltip title={SYNC_NEVER_LABEL}>
        <span tabIndex={0} aria-label={SYNC_NEVER_LABEL}>
          <SyncOutlinedIcon fontSize="small" color={SYNC_ICON_COLOR_NEVER} />
        </span>
      </Tooltip>
    );
  }

  const OutcomeIcon = SYNC_OUTCOME_ICONS[outcome];
  const syncedAt = formatDateTimeFull(lastSyncedAt);
  const headline =
    outcome === SYNC_OUTCOME.OK && syncedAt !== null
      ? `${SYNC_OK_TOOLTIP_PREFIX}${syncedAt}`
      : SYNC_OUTCOME_LABELS[outcome];
  const hasError = lastSyncError !== null && lastSyncError.length > 0;

  return (
    <Tooltip
      title={
        <>
          <Typography variant="body2" component="div">
            {headline}
          </Typography>
          {hasError ? (
            <Typography variant="caption" component="div">
              {lastSyncError}
            </Typography>
          ) : null}
        </>
      }
    >
      <span tabIndex={0} aria-label={hasError ? `${headline}. ${lastSyncError}` : headline}>
        <OutcomeIcon fontSize="small" color={SYNC_OUTCOME_ICON_COLORS[outcome]} />
      </span>
    </Tooltip>
  );
}
