import { FIELD_GAP } from '../constants/layout.constants';

/**
 * Суффиксы id подписей Select'ов: полный id — `${application.id}${SUFFIX}`. Префикс из id
 * записи обязателен, потому что раскрытых аккордеонов на странице может быть несколько,
 * а labelId связывает InputLabel и Select и должен быть уникален (a11y).
 */
export const STATUS_LABEL_ID_SUFFIX = '-status-label';
export const RESULT_LABEL_ID_SUFFIX = '-result-label';

/** Ряд полей §7.2.2: собственный flex-контейнер с переносом и зазором 8px по обеим осям. */
export const ROW_SX = { display: 'flex', flexWrap: 'wrap', gap: FIELD_GAP } as const;

/**
 * Пикеры в MUI X v9 рендерят PickersTextField, а не MuiTextField, поэтому defaultProps
 * темы (theme.ts:23) до них не доходят — плотность §7.8 задаётся слоту явно.
 */
export const PICKER_TEXT_FIELD_SLOT_PROPS = { fullWidth: true, size: 'small' } as const;

/** clearable — проп поля, а не пикера (§7.2.2: DateTimePicker должен уметь очищаться в null). */
export const PICKER_FIELD_SLOT_PROPS = { clearable: true } as const;

/** 24-часовой формат: подписи ru-локали и §7.8 не знают про AM/PM. */
export const PICKER_AMPM = false;
