import { createTheme } from '@mui/material/styles';

import {
  BASE_FONT_SIZE_PX,
  BORDER_RADIUS_PX,
  FONT_FAMILY,
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
      // main: '#86E4E1',
      main: '#50565C',
    },

    secondary: {
      main: '#DD9755',
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
    },
    MuiToggleButton: {
      defaultProps: { size: 'small' },
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
  },
});
