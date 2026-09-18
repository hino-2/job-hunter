import type { VacancySource } from '../../types/application.type';

/**
 * Фолбэк SourceIcon (§4.10, §7.2.1): показывается, когда фавикон источника отдал 404,
 * либо вакансия ещё не распознана (source === null). Двухбуквенная монограмма вместо
 * иконки сайта — так же, как буква-фолбэк у Avatar-логотипа компании.
 */
export const SOURCE_BADGE_ABBREVIATIONS: Record<VacancySource, string> = {
  HH: 'HH',
  GETMATCH: 'GM',
  IT_VACANCIES: 'IT',
  GEEKJOB: 'GJ',
};

/** Каждый цвет проверен на контраст ≥5:1 к белому тексту — не осветлять без повторной проверки. */
export const SOURCE_BADGE_COLORS: Record<VacancySource, string> = {
  HH: '#D6001C',
  GETMATCH: '#1A5FD0',
  IT_VACANCIES: '#6244D6',
  GEEKJOB: '#0B7A54',
};

// ACCENT_CONTRAST_TEXT_COLOR (#262626, theme.constants.ts) здесь не годится: он тёмный
// и не читается на цветах ниже — им подобран отдельный белый.
export const SOURCE_BADGE_TEXT_COLOR = '#FFFFFF';

export const SOURCE_BADGE_UNKNOWN_ABBREVIATION = '?';
export const SOURCE_BADGE_UNKNOWN_COLOR = 'action.disabledBackground';
