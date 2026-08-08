import { ruRU } from '@mui/x-date-pickers/locales';

/**
 * Русские подписи и aria-метки DateTimePicker'ов (§7.8). Локаль dayjs (adapterLocale)
 * переводит только названия месяцев и дней — тексты самих контролов («Clear value»,
 * «Choose date») живут отдельно, в localeText провайдера.
 */
export const PICKERS_LOCALE_TEXT = ruRU.components.MuiLocalizationProvider.defaultProps.localeText;
