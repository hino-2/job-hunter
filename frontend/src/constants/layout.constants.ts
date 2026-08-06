/**
 * Размеры и отступы списка вакансий (спецификация §7.2).
 * Все зазоры — в единицах системы отступов MUI: spacing(1) === 8px.
 * Числовых литералов размеров в JSX быть не должно — только эти константы.
 */

/** Базовый зазор между любыми соседними полями и между аккордеонами: 8px. */
export const FIELD_GAP = 1;
export const ACCORDION_GAP = 1;

/** Внутренние отступы: 16px по горизонтали, 8px сверху / 16px снизу. */
export const CONTAINER_PADDING_X = 2;
export const ACCORDION_DETAILS_PADDING_X = 2;
export const ACCORDION_DETAILS_PADDING_TOP = 1;
export const ACCORDION_DETAILS_PADDING_BOTTOM = 2;

/** Шапка аккордеона (свёрнутое состояние, §7.2.1). */
export const SUMMARY_COMPANY_WIDTH_PX = 220;

/** flex-basis полей в раскрытом состоянии (§7.2.2). */
export const FIELD_FLEX = {
  company: '1 1 240px',
  position: '1 1 240px',
  status: '0 0 150px',
  result: '0 0 190px',
  vacancyUrl: '1 1 280px',
  resumeUrl: '1 1 280px',
  hrInterviewAt: '0 0 210px',
  techInterviewAt: '0 0 210px',
  employerContact: '1 1 320px',
  notes: '2 1 480px',
} as const;

/** Собеседование в пределах этого окна выделяется как ближайшее. */
export const UPCOMING_INTERVIEW_HIGHLIGHT_HOURS = 48;

export const DATE_TIME_DISPLAY_FORMAT = 'DD.MM.YYYY HH:mm';

/** Короткий формат для шапки аккордеона. */
export const DATE_TIME_SHORT_FORMAT = 'DD.MM HH:mm';

export const DATE_LOCALE = 'ru';

/** Сколько скелетонов показывать во время загрузки списка. */
export const LIST_SKELETON_COUNT = 4;

export const MULTILINE_MAX_ROWS_CONTACT = 3;
export const MULTILINE_MAX_ROWS_NOTES = 4;
