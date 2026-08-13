import { Box } from '@mui/material';

import {
  FIELD_CELL_MIN_WIDTH_PX,
  SAVED_FIELD_RING_NONE,
  SAVED_FIELD_RING_OFFSETS,
  SAVED_FIELD_RING_RADIUS,
  SAVED_FIELD_TRANSITION,
  SAVED_FIELD_RING_WIDTH_PX,
} from '../../constants/layout.constants';
import type { FieldCellProps } from './field-cell.interfaces';

/**
 * Ячейка ряда раскрытого состояния (§7.2.2) и единая индикация «сохранено» (§7.3).
 *
 * Подсветка — кольцо boxShadow вокруг ячейки, а не иконка «✓» в InputAdornment:
 * у Select и DateTimePicker адорнмент уже занят собственной кнопкой, а кольцо выглядит
 * одинаково у всех трёх контролов.
 */
export function FieldCell({ flex, maxWidth, isSaved, children }: FieldCellProps) {
  return (
    <Box
      sx={{
        flex,
        maxWidth,
        minWidth: FIELD_CELL_MIN_WIDTH_PX,
        borderRadius: SAVED_FIELD_RING_RADIUS,
        transition: SAVED_FIELD_TRANSITION,
        boxShadow: isSaved
          ? (theme) =>
              `${SAVED_FIELD_RING_OFFSETS} ${SAVED_FIELD_RING_WIDTH_PX}px ${theme.palette.success.main}`
          : SAVED_FIELD_RING_NONE,
      }}
    >
      {children}
    </Box>
  );
}
