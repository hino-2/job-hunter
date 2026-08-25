export const THEME_MODE = 'light';

/** Плотный интерфейс: все поля size="small", шрифт чуть меньше стандартного. */
export const BASE_FONT_SIZE_PX = 14;

export const BORDER_RADIUS_PX = 6;

/**
 * Акцент шапки, активной вкладки и всех contained-кнопок. Отдельно от palette.primary:
 * тот держит рамки полей, иконки и outlined-кнопки — перекрасив его, бирюзовым стал бы
 * весь интерфейс.
 */
export const ACCENT_COLOR = '#86E4E1';

export const FONT_FAMILY = [
  'Inter',
  'Segoe UI',
  'Roboto',
  'Helvetica Neue',
  'Arial',
  'sans-serif',
].join(', ');

/** Наведение на акцентную contained-кнопку: тот же бирюзовый, на шаг темнее. */
export const ACCENT_HOVER_COLOR = '#6FD3D0';

/** Текст на бирюзовом фоне: palette.text.primary — оранжевый, на акценте нечитаем. */
export const ACCENT_CONTRAST_TEXT_COLOR = '#262626';

/** Прозрачность рамки outlined-кнопки MUI — повторяем её для одиночного ToggleButton. */
export const OUTLINED_BORDER_OPACITY = 0.5;
