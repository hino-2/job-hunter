import type SvgIcon from '@mui/material/SvgIcon';

import type {
  APPLICATION_ORDER,
  APPLICATION_RESULT,
  APPLICATION_SORT_ORDER_LIST,
  APPLICATION_STATUS,
  STATUS_FILTER,
  SYNC_OUTCOME,
} from '../constants/application.constants';

/** §3.2 */
export type ApplicationStatus = (typeof APPLICATION_STATUS)[keyof typeof APPLICATION_STATUS];

/** §3.3 */
export type ApplicationResult = (typeof APPLICATION_RESULT)[keyof typeof APPLICATION_RESULT];

/** §4.5 */
export type SyncOutcome = (typeof SYNC_OUTCOME)[keyof typeof SYNC_OUTCOME];

/** Значение переключателя «Все / Открытые / Закрытые» (§7.1): ALL параметром не уходит. */
export type StatusFilter = (typeof STATUS_FILTER)[keyof typeof STATUS_FILTER];

/** §5.1: допустимые значения query-параметра sort. */
export type ApplicationSortField = (typeof APPLICATION_SORT_ORDER_LIST)[number];

export type ApplicationOrder = (typeof APPLICATION_ORDER)[keyof typeof APPLICATION_ORDER];

/**
 * Собственные литеральные union'ы, а не ChipProps['color'] / SvgIconProps['color']:
 * так application.constants.ts не тянет типы MUI, а присваиваемость в проп color
 * при этом сохраняется.
 */
export type ResultChipColor = 'default' | 'success' | 'error';

export type SyncIconColor = 'success' | 'warning' | 'error' | 'disabled';

/**
 * Тип компонента иконки MUI для карты SYNC_OUTCOME_ICONS. Собственный псевдоним, потому
 * что @mui/icons-material v9 объявляет SvgIconComponent без export
 * (node_modules/@mui/icons-material/index.d.ts:3) — импортировать его нельзя.
 */
export type IconComponent = typeof SvgIcon;
