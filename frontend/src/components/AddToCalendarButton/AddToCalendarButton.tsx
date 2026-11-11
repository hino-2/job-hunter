import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { Button, Tooltip } from '@mui/material';

import { ADD_TO_CALENDAR_LABEL } from '../../constants/google-calendar.constants';
import { CALENDAR_BUTTON_SX } from '../../constants/layout.constants';
import type { AddToCalendarButtonProps } from './add-to-calendar-button.interfaces';

/**
 * Квадратная кнопка справа от даты собеса (§7.2.2): открывает форму нового события
 * Google Календаря в новой вкладке. Обёртка span нужна Tooltip'у: у неактивной кнопки
 * pointer-events: none, и без обёртки подсказка не появлялась бы.
 */
export function AddToCalendarButton({ href }: AddToCalendarButtonProps) {
  return (
    <Tooltip title={ADD_TO_CALENDAR_LABEL}>
      <span>
        <Button
          component="a"
          variant="outlined"
          aria-label={ADD_TO_CALENDAR_LABEL}
          disabled={href === null}
          href={href ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
          sx={CALENDAR_BUTTON_SX}
        >
          <CalendarMonthIcon fontSize="small" />
        </Button>
      </span>
    </Tooltip>
  );
}
