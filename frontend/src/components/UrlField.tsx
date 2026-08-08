import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { CircularProgress, IconButton, InputAdornment, TextField, Tooltip } from '@mui/material';
import type { ChangeEvent } from 'react';

import { INVALID_URL_MESSAGE, OPEN_LINK_LABEL } from '../constants/application.constants';
import { FIELD_PROGRESS_SIZE_PX } from '../constants/layout.constants';
import { isSavableUrl, toExternalHref } from '../utils/url.utils';
import type { UrlFieldProps } from './url-field.interfaces';

/**
 * Поле-ссылка ряда 2 (§7.2.2): TextField с кнопкой OpenInNew в адорнменте.
 *
 * Заведомо невалидное значение показывается ошибкой на самом поле, а PATCH с ним
 * не отправляется вовсе: @IsUrl в UpdateApplicationDto ответил бы 400, и вместо подсказки
 * пользователь получил бы Snackbar посреди набора ссылки.
 */
export function UrlField({
  label,
  value,
  maxLength,
  onValueChange,
  onBlur,
  isLoading,
  autoFocus,
}: UrlFieldProps) {
  const href = toExternalHref(value);
  const isInvalid = value.trim().length > 0 && !isSavableUrl(value);

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onValueChange(event.target.value);
  };

  return (
    <TextField
      fullWidth
      autoFocus={autoFocus}
      label={label}
      value={value}
      error={isInvalid}
      helperText={isInvalid ? INVALID_URL_MESSAGE : undefined}
      onChange={handleChange}
      onBlur={onBlur}
      slotProps={{
        htmlInput: { maxLength },
        input: {
          endAdornment: (
            <InputAdornment position="end">
              {isLoading === true ? (
                // Поле остаётся редактируемым во время preview (§4.4) — спиннер лишь
                // сигнализирует о фоновом запросе, ничего не блокируя.
                <CircularProgress size={FIELD_PROGRESS_SIZE_PX} />
              ) : null}

              {/* Tooltip и disabled требуют обёртки: отключённая кнопка событий мыши
                  не порождает, и подсказка на ней иначе не показалась бы. */}
              <Tooltip title={OPEN_LINK_LABEL}>
                <span>
                  {href === null ? (
                    // disabled нельзя вешать на IconButton component="a": MUI отдал бы
                    // якорь с pointer-events: none и невалидной для ссылки разметкой.
                    <IconButton disabled aria-label={OPEN_LINK_LABEL}>
                      <OpenInNewIcon fontSize="small" />
                    </IconButton>
                  ) : (
                    <IconButton
                      component="a"
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={OPEN_LINK_LABEL}
                    >
                      <OpenInNewIcon fontSize="small" />
                    </IconButton>
                  )}
                </span>
              </Tooltip>
            </InputAdornment>
          ),
        },
      }}
    />
  );
}
