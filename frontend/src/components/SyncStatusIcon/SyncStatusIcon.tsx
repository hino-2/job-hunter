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
  SYNC_SOURCE_TOOLTIP_PREFIX,
  VACANCY_SOURCE_LABELS,
  VACANCY_SOURCE_UNKNOWN_LABEL,
} from '../../constants/application.constants';
import { formatDateTimeFull } from '../../utils/date.utils';
import type { SyncStatusIconProps } from './sync-status-icon.interfaces';

/** §4.8: строка «Источник: hh.ru» / «Источник: getmatch.ru» / «Источник не определён». */
function describeSource(source: SyncStatusIconProps['source']): string {
  const label = source === null ? VACANCY_SOURCE_UNKNOWN_LABEL : VACANCY_SOURCE_LABELS[source];

  return `${SYNC_SOURCE_TOOLTIP_PREFIX}${label}`;
}

/**
 * Элемент 6 свёрнутой шапки (§7.2.1): статус последней синхронизации + tooltip.
 * Источник вакансии показывается третьей строкой независимо от outcome (§7.2.1 п.6,
 * §4.8) — своей строки в шапке под него не заводим, чтобы не сломать §13.10.4.
 */
export function SyncStatusIcon({
  outcome,
  lastSyncedAt,
  lastSyncError,
  source,
}: SyncStatusIconProps) {
  const sourceLine = describeSource(source);

  // Записи, которые ещё ни разу не синхронизировались, тоже занимают место в строке —
  // иначе колонка «прыгала» бы по ширине от записи к записи.
  // Обёртка span с tabIndex обязательна: сама SvgIcon фокус не принимает, и с клавиатуры
  // текст подсказки (в том числе lastSyncError) был бы недостижим.
  if (outcome === null) {
    return (
      <Tooltip
        title={
          <>
            <Typography variant="body2" component="div">
              {SYNC_NEVER_LABEL}
            </Typography>
            <Typography variant="caption" component="div">
              {sourceLine}
            </Typography>
          </>
        }
      >
        <span tabIndex={0} aria-label={`${SYNC_NEVER_LABEL}. ${sourceLine}`}>
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
  const ariaLabel = hasError
    ? `${headline}. ${lastSyncError} ${sourceLine}`
    : `${headline}. ${sourceLine}`;

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
          <Typography variant="caption" component="div">
            {sourceLine}
          </Typography>
        </>
      }
    >
      <span tabIndex={0} aria-label={ariaLabel}>
        <OutcomeIcon fontSize="small" color={SYNC_OUTCOME_ICON_COLORS[outcome]} />
      </span>
    </Tooltip>
  );
}
