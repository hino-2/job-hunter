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
    },
    MuiSelect: {
      defaultProps: { size: 'small' },
    },
    // Без него подпись Select'а не ужимается под size="small" самого Select'а.
    MuiFormControl: {
      defaultProps: { size: 'small' },
    },
    MuiChip: {
      defaultProps: { size: 'small' },
    },
    MuiIconButton: {
      defaultProps: { size: 'small' },
    },
    MuiButton: {
      defaultProps: { size: 'small' },
    },
    MuiToggleButton: {
      defaultProps: { size: 'small' },
    },
    MuiToggleButtonGroup: {
      defaultProps: { size: 'small' },
    },
  },
});
