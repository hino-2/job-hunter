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
export const CONTAINER_PADDING_Y = 2;
export const ACCORDION_DETAILS_PADDING_X = 2;
export const ACCORDION_DETAILS_PADDING_TOP = 1;
export const ACCORDION_DETAILS_PADDING_BOTTOM = 2;

/** Шапка аккордеона (свёрнутое состояние, §7.2.1). */
export const SUMMARY_COMPANY_WIDTH_PX = 220;

/** Свёрнутая шапка — одна строка ~48px (§7.2.1): столько нужно, чтобы на 1920×1080
 *  помещалось не меньше 12 записей (§13.10.4). */
export const SUMMARY_MIN_HEIGHT_PX = 48;

/** 16px по горизонтали — как у внешнего контейнера, чтобы колонки визуально совпадали. */
export const SUMMARY_PADDING_X = 2;

/** MUI по умолчанию даёт содержимому шапки margin 12px по вертикали, из-за чего строка
 *  вырастает выше 48px и §13.10.4 перестаёт выполняться. */
export const SUMMARY_CONTENT_MARGIN_Y = 0;

/** Флексбокс-приём: без minWidth: 0 элемент с noWrap-текстом не сжимается ниже своей
 *  контентной ширины и распирает страницу горизонтальным скроллом (§13.10.5). */
export const SUMMARY_TEXT_MIN_WIDTH_PX = 0;

/** Зазор между иконкой и её подписью внутри одной «ячейки» шапки. */
export const SUMMARY_ICON_GAP = 0.5;

/** flex элементов свёрнутой шапки (§7.2.1). */
export const SUMMARY_FLEX = {
  company: `0 0 ${SUMMARY_COMPANY_WIDTH_PX}px`,
  position: '1 1 auto',
  auto: '0 0 auto',
} as const;

export const ACCORDION_ELEVATION = 1;
export const APP_BAR_ELEVATION = 1;

/** Заголовок в AppBar растягивается и отжимает кнопку со счётчиком вправо (§7.1). */
export const APP_BAR_TITLE_FLEX_GROW = 1;

/** Ширины контролов панели фильтров (§7.1). */
export const SEARCH_FIELD_WIDTH_PX = 280;
export const SORT_FIELD_WIDTH_PX = 220;

/** Вертикальные отступы пустого состояния (§7.8). */
export const EMPTY_STATE_PADDING_Y = 6;

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

export const MULTILINE_MIN_ROWS = 1;
export const MULTILINE_MAX_ROWS_CONTACT = 3;
export const MULTILINE_MAX_ROWS_NOTES = 4;

/**
 * Ячейка поля в раскрытом состоянии: без minWidth: 0 контрол не сжимается ниже
 * своей flex-basis и на узком экране даёт горизонтальный скролл (§13.10.5).
 */
export const FIELD_CELL_MIN_WIDTH_PX = 0;

/** Подсветка «сохранено» (§7.3): рамка вокруг ячейки на ~1 с, без спиннеров. */
export const SAVED_FIELD_RING_WIDTH_PX = 2;
export const SAVED_FIELD_RING_RADIUS = 1;
export const SAVED_FIELD_TRANSITION = 'box-shadow 200ms ease-in-out';

/** Кольцо рисуется одним spread'ом, смещения и размытие нулевые — отсюда «0 0 0». */
export const SAVED_FIELD_RING_OFFSETS = '0 0 0';
export const SAVED_FIELD_RING_NONE = 'none';

/** Сколько держать подсветку сохранённого поля (§7.3: «~1 с»). */
export const SAVED_FLASH_DURATION_MS = 1000;

/** Сообщение об ошибке автосейва должно успеть прочитаться (§7.3). */
export const SNACKBAR_AUTO_HIDE_MS = 6000;

/** Снизу по центру: Snackbar не перекрывает ни шапку, ни панель фильтров. */
export const SNACKBAR_ANCHOR_ORIGIN = { vertical: 'bottom', horizontal: 'center' } as const;

/** Ряд полей §7.2.2: собственный flex-контейнер с переносом и зазором 8px по обеим осям. */
export const ROW_SX = { display: 'flex', flexWrap: 'wrap', gap: FIELD_GAP } as const;

/** Спиннер preview в endAdornment поля-ссылки (§4.4) — по размеру рядом с иконкой OpenInNew. */
export const FIELD_PROGRESS_SIZE_PX = 16;

/** Без него обрезается floating label самого верхнего поля диалога. */
export const DIALOG_CONTENT_PADDING_TOP = 1;

/** §7.6 буквально: CircularProgress size=16 вместо иконки 🔄. */
export const SUMMARY_SYNC_PROGRESS_SIZE_PX = 16;

/** Проблемных записей в сводке §7.7 может быть до 50 — список скроллится, а не растёт вниз. */
export const SYNC_SUMMARY_LIST_MAX_HEIGHT_PX = 240;
