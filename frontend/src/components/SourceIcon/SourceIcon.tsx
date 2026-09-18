import { Avatar, Tooltip } from '@mui/material';

import {
  VACANCY_SOURCE_LABELS,
  VACANCY_SOURCE_UNKNOWN_LABEL,
} from '../../constants/application.constants';
import {
  SOURCE_BADGE_FONT_SIZE,
  SUMMARY_FLEX,
  SUMMARY_LOGO_SIZE_PX,
} from '../../constants/layout.constants';
import { buildSourceIconUrl } from '../../utils/source-icon.utils';
import {
  SOURCE_BADGE_ABBREVIATIONS,
  SOURCE_BADGE_COLORS,
  SOURCE_BADGE_TEXT_COLOR,
  SOURCE_BADGE_UNKNOWN_ABBREVIATION,
  SOURCE_BADGE_UNKNOWN_COLOR,
} from './source-icon.constants';
import type { SourceIconProps } from './source-icon.interfaces';

/**
 * Иконка сайта-источника (§4.10, §7.2.1/§7.9.1): круглый Avatar со src на
 * GET /api/vacancy-sources/:source/icon (§5.8) — браузер никогда не ходит на сайт
 * источника напрямую, как и с логотипом компании. Фолбэк структурный, а не написанный
 * руками: MUI Avatar сам показывает children, когда src не загрузился (404 источника
 * ещё не догнан бэкендом), — поэтому здесь нет onError/useState.
 *
 * Без обёртки <span tabIndex={0}>, в отличие от SyncStatusIcon: там tooltip несёт
 * lastSyncError, которого больше нигде не видно, а здесь tooltip лишь повторяет
 * название сайта, уже озвученное role="img" + aria-label — второй таб-стоп на строку
 * ради дублирующего текста был бы лишним.
 *
 * Никогда не возвращает null: пропуск иконки сдвигал бы ячейку компании между строками.
 */
export function SourceIcon({ source }: SourceIconProps) {
  const label = source === null ? VACANCY_SOURCE_UNKNOWN_LABEL : VACANCY_SOURCE_LABELS[source];
  const abbreviation =
    source === null ? SOURCE_BADGE_UNKNOWN_ABBREVIATION : SOURCE_BADGE_ABBREVIATIONS[source];
  const bgcolor = source === null ? SOURCE_BADGE_UNKNOWN_COLOR : SOURCE_BADGE_COLORS[source];

  return (
    <Tooltip title={label}>
      <Avatar
        variant="circular"
        role="img"
        aria-label={label}
        src={source === null ? undefined : buildSourceIconUrl(source)}
        sx={{
          width: SUMMARY_LOGO_SIZE_PX,
          height: SUMMARY_LOGO_SIZE_PX,
          fontSize: SOURCE_BADGE_FONT_SIZE,
          fontWeight: 'bold',
          bgcolor,
          color: SOURCE_BADGE_TEXT_COLOR,
          flex: SUMMARY_FLEX.auto,
        }}
      >
        {abbreviation}
      </Avatar>
    </Tooltip>
  );
}
