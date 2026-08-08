import { ruRU } from '@mui/x-date-pickers/locales';

/**
 * Русские подписи и aria-метки DateTimePicker'ов (§7.8). Локаль dayjs (adapterLocale)
 * переводит только названия месяцев и дней — тексты самих контролов («Clear value»,
 * «Choose date») живут отдельно, в localeText провайдера.
 */
export const PICKERS_LOCALE_TEXT = ruRU.components.MuiLocalizationProvider.defaultProps.localeText;

/**
 * Пикеры в MUI X v9 рендерят PickersTextField, а не MuiTextField, поэтому defaultProps
 * темы (theme.ts:23) до них не доходят — плотность §7.8 задаётся слоту явно.
 */
export const PICKER_TEXT_FIELD_SLOT_PROPS = { fullWidth: true, size: 'small' } as const;

/** clearable — проп поля, а не пикера (§7.2.2: DateTimePicker должен уметь очищаться в null). */
export const PICKER_FIELD_SLOT_PROPS = { clearable: true } as const;

/** 24-часовой формат: подписи ru-локали и §7.8 не знают про AM/PM. */
export const PICKER_AMPM = false;
