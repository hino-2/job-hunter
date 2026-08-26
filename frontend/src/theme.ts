import { buttonClasses } from '@mui/material/Button';
import { alpha, createTheme } from '@mui/material/styles';

import {
  ACCENT_COLOR,
  ACCENT_CONTRAST_TEXT_COLOR,
  ACCENT_HOVER_COLOR,
  BASE_FONT_SIZE_PX,
  BORDER_RADIUS_PX,
  FONT_FAMILY,
  OUTLINED_BORDER_OPACITY,
  THEME_MODE,
} from './constants/theme.constants';

export const theme = createTheme({
  palette: {
    mode: THEME_MODE,
    background: {
      default: '#262626',
      paper: '#2C2C2C',
    },

    text: {
      primary: '#DD9755',
      secondary: '#A86F3F',
    },

    primary: {
      main: '#50565C',
    },

    secondary: {
      main: '#DD9755',
    },

    success: {
      main: '#078d0b',
    },
  },

  shape: {
    borderRadius: BORDER_RADIUS_PX,
  },
  typography: {
    fontFamily: FONT_FAMILY,
    fontSize: BASE_FONT_SIZE_PX,
  },
  components: {
    // Плотный интерфейс по умолчанию — спецификация §7.8.
    MuiTextField: {
      defaultProps: { size: 'small' },

      styleOverrides: {
        root: ({ theme }) => ({
          '& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline': {
            border: `1px solid ${theme.palette.primary.main}`,
          },

          '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
            border: `1px solid ${theme.palette.primary.main}`,
          },

          '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
            border: `1px solid ${theme.palette.primary.main}`,
          },
        }),
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme }) => ({
          '& .MuiSvgIcon-root': {
            color: theme.palette.primary.main,
          },
        }),
      },
    },
    MuiSelect: {
      defaultProps: { size: 'small' },

      styleOverrides: {
        root: ({ theme }) => ({
          '& .MuiSelect-notchedOutline': {
            border: `1px solid ${theme.palette.primary.main}`,
          },

          '&:hover .MuiSelect-notchedOutline': {
            borderColor: theme.palette.primary.main,
          },

          '&.Mui-focused .MuiSelect-notchedOutline': {
            borderColor: theme.palette.primary.main,
          },

          '& ~ .MuiSvgIcon-root': {
            color: theme.palette.primary.main,
          },
        }),
      },
    },
    // Без него подпись Select'а не ужимается под size="small" самого Select'а.
    MuiFormControl: {
      defaultProps: { size: 'small' },

      styleOverrides: {
        root: ({ theme }) => ({
          '& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline': {
            border: `1px solid ${theme.palette.primary.main}`,
          },

          '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
            border: `1px solid ${theme.palette.primary.main}`,
          },

          '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
            border: `1px solid ${theme.palette.primary.main}`,
          },
        }),
      },
    },
    MuiChip: {
      defaultProps: { size: 'small' },
    },
    MuiIconButton: {
      defaultProps: { size: 'small' },

      styleOverrides: {
        root: ({ theme }) => ({
          color: theme.palette.primary.main,

          '&:hover': {
            color: theme.palette.primary.main,
          },
        }),
      },
    },
    MuiButton: {
      defaultProps: { size: 'small' },

      styleOverrides: {
        // Все contained-кнопки — цветом активной вкладки (ACCENT_COLOR). Через
        // styleOverrides, а не palette.primary: тот держит рамки полей, иконки и
        // outlined-кнопки — перекрасив его, бирюзовым стал бы весь интерфейс.
        contained: ({ theme }) => ({
          backgroundColor: ACCENT_COLOR,
          color: ACCENT_CONTRAST_TEXT_COLOR,

          '&:hover': {
            backgroundColor: ACCENT_HOVER_COLOR,
          },

          // Исключение из правила выше — зелёная кнопка «Отклик» (§7.9.1). Одного
          // color="success" мало: свой слот containedSuccess у Button'а этой версии MUI
          // отсутствует (overridesResolver знает только root / contained / size* /
          // colorInherit), так что ACCENT_COLOR красил бы кнопку поверх палитры. Селектор
          // по классу цвета специфичнее голого contained и перебивает его.
          [`&.${buttonClasses.colorSuccess}`]: {
            backgroundColor: theme.palette.success.main,
            color: theme.palette.success.contrastText,

            '&:hover': {
              backgroundColor: theme.palette.success.dark,
            },
          },

          // Дизейбл — той же штатной палитрой, что и по умолчанию у MUI: страховка на
          // случай, если фон/текст выше разойдутся с палитрой action. Объявлен строго
          // после блока colorSuccess: специфичность у них одинаковая (два класса), решает
          // порядок — иначе выключенная кнопка «Отклик» осталась бы зелёной.
          '&.Mui-disabled': {
            backgroundColor: theme.palette.action.disabledBackground,
            color: theme.palette.action.disabled,
          },
        }),
      },
    },
    MuiToggleButton: {
      defaultProps: { size: 'small' },

      styleOverrides: {
        // Выключенный переключатель — как outlined-кнопки рядом: серый palette.primary
        // вместо дефолтных MUI action.active и divider. Полупрозрачность рамки и подсветки
        // повторяет формулу самой outlined-кнопки, иначе рамка вышла бы плотнее соседней,
        // а hover — оранжевым от text.primary. Цвет и рамку внутри ToggleButtonGroup
        // правило ниже перебивает по специфичности, а вот hover достаётся и кнопкам
        // фильтра статусов: своего hover у группы нет, и серая подсветка там уместнее
        // оранжевой — текст и рамка у них тоже серые.
        root: ({ theme }) => ({
          '&:not(.Mui-selected)': {
            color: theme.palette.primary.main,
            borderColor: alpha(theme.palette.primary.main, OUTLINED_BORDER_OPACITY),

            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, theme.palette.action.hoverOpacity),
            },
          },
        }),
      },
    },
    MuiToggleButtonGroup: {
      defaultProps: { size: 'small' },

      styleOverrides: {
        root: ({ theme }) => ({
          color: theme.palette.primary.main,
          border: `1px solid ${theme.palette.primary.main}`,

          // Невыбранные кнопки
          '& .MuiToggleButton-root:not(.Mui-selected)': {
            color: theme.palette.primary.main,
            borderColor: theme.palette.primary.main,
          },

          // Выбранная кнопка
          '&.Mui-selected': {
            color: theme.palette.primary.main,
            borderColor: theme.palette.primary.main,
            backgroundColor: 'transparent',
          },

          '&.Mui-selected:hover': {
            color: theme.palette.primary.main,
            borderColor: theme.palette.primary.main,
            backgroundColor: 'transparent',
          },
        }),
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.primary.main,
        }),
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: ACCENT_COLOR,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            color: ACCENT_COLOR,
          },
        },
      },
    },
  },
});
