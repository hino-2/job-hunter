import type SvgIcon from '@mui/material/SvgIcon';

import type {
  APPLICATION_ORDER,
  APPLICATION_RESULT,
  APPLICATION_SORT_ORDER_LIST,
  APPLICATION_STATUS,
  EDITABLE_FIELDS,
  EDITABLE_TEXT_FIELDS,
  STATUS_FILTER,
  SYNC_OUTCOME,
  URL_TEXT_FIELDS,
  VACANCY_SOURCE,
} from '../constants/application.constants';

/** §3.2 */
export type ApplicationStatus = (typeof APPLICATION_STATUS)[keyof typeof APPLICATION_STATUS];

/** §3.3 */
export type ApplicationResult = (typeof APPLICATION_RESULT)[keyof typeof APPLICATION_RESULT];

/** §4.5 */
export type SyncOutcome = (typeof SYNC_OUTCOME)[keyof typeof SYNC_OUTCOME];

/** §4.8 */
export type VacancySource = (typeof VACANCY_SOURCE)[keyof typeof VACANCY_SOURCE];

/** Значение переключателя «Все / Открытые / Закрытые» (§7.1): ALL параметром не уходит. */
export type StatusFilter = (typeof STATUS_FILTER)[keyof typeof STATUS_FILTER];

/** §5.1: допустимые значения query-параметра sort. */
export type ApplicationSortField = (typeof APPLICATION_SORT_ORDER_LIST)[number];

export type ApplicationOrder = (typeof APPLICATION_ORDER)[keyof typeof APPLICATION_ORDER];

/** Поле §7.2.2 с текстовым вводом: blur + debounce-автосейв (§7.3). */
export type EditableTextField = (typeof EDITABLE_TEXT_FIELDS)[number];

/** Любое редактируемое поле раскрытого состояния (§7.2.2). */
export type EditableField = (typeof EDITABLE_FIELDS)[number];

/** Текстовое поле со ссылкой (§7.2.2, ряд 2): у него своя проверка перед отправкой. */
export type UrlTextField = (typeof URL_TEXT_FIELDS)[number];

/**
 * Текстовые поля, которые API разрешает очищать в null (§5.1). Компания сюда не входит:
 * она обязательна, и пустой её PATCH не принимает.
 */
export type NullableTextField = Exclude<EditableTextField, 'company'>;

/** Патч одного очищаемого текстового поля — ровно то, что собирает buildTextPatch. */
export type NullableTextPatch = Partial<Record<NullableTextField, string | null>>;

/**
 * Несохранённый ввод текстовых полей одной записи (§7.3). Поля здесь нет — значит,
 * его не трогали, и показывается значение из кэша React Query.
 */
export type PendingTextValues = Partial<Record<EditableTextField, string>>;

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
