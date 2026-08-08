import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import type { DateTimeValidationError, PickerChangeHandlerContext } from '@mui/x-date-pickers';
import type { Dayjs } from 'dayjs';
import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';

import {
  APPLICATION_FIELD_LABELS,
  APPLICATION_RESULT_LABELS,
  APPLICATION_RESULT_ORDER,
  COMPANY_MAX_LENGTH,
  COMPANY_REQUIRED_MESSAGE,
  CREATE_APPLICATION_INITIAL_VALUES,
  EMPLOYER_CONTACT_MAX_LENGTH,
  NOTES_MAX_LENGTH,
  POSITION_MAX_LENGTH,
  URL_MAX_LENGTH,
} from '../constants/application.constants';
import {
  DATE_TIME_DISPLAY_FORMAT,
  DIALOG_CONTENT_PADDING_TOP,
  FIELD_FLEX,
  FIELD_GAP,
  MULTILINE_MAX_ROWS_CONTACT,
  MULTILINE_MAX_ROWS_NOTES,
  MULTILINE_MIN_ROWS,
  ROW_SX,
} from '../constants/layout.constants';
import {
  PICKER_AMPM,
  PICKER_FIELD_SLOT_PROPS,
  PICKER_TEXT_FIELD_SLOT_PROPS,
} from '../constants/pickers.constants';
import { useHhPreview } from '../hooks/useHhPreview';
import type { CreateApplicationFormValues } from '../types/application.interfaces';
import type { ApplicationResult } from '../types/application.type';
import type { HhPreview } from '../types/hh.interfaces';
import { buildCreateApplicationPayload } from '../utils/application.utils';
import { isCommittableDate, toDayjsOrNull, toIsoOrNull } from '../utils/date.utils';
import { isSavableUrl } from '../utils/url.utils';
import {
  CREATE_DIALOG_MAX_WIDTH,
  CREATE_DIALOG_RESULT_LABEL_ID,
} from './create-application-dialog.constants';
import type { CreateApplicationDialogProps } from './create-application-dialog.interfaces';
import { FieldCell } from './FieldCell';
import { UrlField } from './UrlField';

/**
 * Форма создания записи (§7.4). Состояние формы живёт здесь, а не в App: перерисовка
 * на каждое нажатие клавиши не должна подниматься наверх и пробивать memo аккордеонов.
 *
 * Диалог монтируется условно из App ({isCreateOpen ? <CreateApplicationDialog … /> : null}),
 * поэтому свежий монтаж уже даёт чистую форму — сбрасывать её через useEffect не нужно
 * (и запрещено правилом react-hooks/set-state-in-effect).
 */
export function CreateApplicationDialog({
  isSubmitting,
  onSubmit,
  onCancel,
  onPreviewFailed,
}: CreateApplicationDialogProps) {
  const [values, setValues] = useState<CreateApplicationFormValues>(
    CREATE_APPLICATION_INITIAL_VALUES,
  );
  const [isCompanyTouched, setCompanyTouched] = useState(false);
  // Источник истины для асинхронных колбэков preview: к моменту ответа состояние
  // могло уйти вперёд, а замыкание onLoaded держало бы устаревшее values.
  const valuesRef = useRef(values);
  const lastPreviewedUrlRef = useRef<string | null>(null);

  const writeValues = (next: CreateApplicationFormValues) => {
    valuesRef.current = next;
    setValues(next);
  };

  const patchValues = (patch: Partial<CreateApplicationFormValues>) => {
    writeValues({ ...valuesRef.current, ...patch });
  };

  const handlePreviewLoaded = (data: HhPreview, url: string) => {
    // Ответ протух: пока запрос летел, ссылку успели изменить ещё раз.
    if (url !== valuesRef.current.vacancyUrl.trim()) {
      return;
    }

    // Не вакансия hh.ru — молча ничего не делаем (§4.4).
    if (data.hhVacancyId === null) {
      return;
    }

    let next = valuesRef.current;
    let changed = false;

    if (data.company !== null && next.company.trim().length === 0) {
      next = { ...next, company: data.company };
      changed = true;
    }

    if (data.position !== null && next.position.trim().length === 0) {
      next = { ...next, position: data.position };
      changed = true;
    }

    if (changed) {
      writeValues(next);
    }
  };

  const handlePreviewFailed = (error: Error) => {
    // Повторный blur обязан дать ретрай, а не молчаливо ничего не делать.
    lastPreviewedUrlRef.current = null;
    onPreviewFailed(error);
  };

  const preview = useHhPreview({ onLoaded: handlePreviewLoaded, onFailed: handlePreviewFailed });

  const handleVacancyUrlBlur = () => {
    const url = valuesRef.current.vacancyUrl.trim();

    if (url.length === 0 || !isSavableUrl(url) || url === lastPreviewedUrlRef.current) {
      return;
    }

    lastPreviewedUrlRef.current = url;
    preview.mutate(url);
  };

  const handleClose = () => {
    if (isSubmitting) {
      return;
    }

    onCancel();
  };

  const handleSubmit = () => {
    onSubmit(buildCreateApplicationPayload(valuesRef.current));
  };

  const handleCompanyChange = (event: ChangeEvent<HTMLInputElement>) => {
    patchValues({ company: event.target.value });
  };

  const handleCompanyBlur = () => {
    setCompanyTouched(true);
  };

  const handlePositionChange = (event: ChangeEvent<HTMLInputElement>) => {
    patchValues({ position: event.target.value });
  };

  const handleEmployerContactChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    patchValues({ employerContact: event.target.value });
  };

  const handleNotesChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    patchValues({ notes: event.target.value });
  };

  const handleResultChange = (event: SelectChangeEvent<ApplicationResult>) => {
    patchValues({ result: event.target.value });
  };

  const handleHrInterviewChange = (
    value: Dayjs | null,
    context: PickerChangeHandlerContext<DateTimeValidationError>,
  ) => {
    if (!isCommittableDate(value, context.validationError)) {
      return;
    }

    patchValues({ hrInterviewAt: toIsoOrNull(value) });
  };

  const handleTechInterviewChange = (
    value: Dayjs | null,
    context: PickerChangeHandlerContext<DateTimeValidationError>,
  ) => {
    if (!isCommittableDate(value, context.validationError)) {
      return;
    }

    patchValues({ techInterviewAt: toIsoOrNull(value) });
  };

  const isCompanyEmpty = values.company.trim().length === 0;
  // Заведомый 400 не отправляем: невалидную ссылку сервер отверг бы целиком, а «Добавить»
  // должна отражать это состояние заранее, а не после ответа сервера.
  const isSubmitDisabled =
    isSubmitting ||
    isCompanyEmpty ||
    !isSavableUrl(values.vacancyUrl) ||
    !isSavableUrl(values.resumeUrl);

  return (
    <Dialog open fullWidth maxWidth={CREATE_DIALOG_MAX_WIDTH} onClose={handleClose}>
      <DialogTitle>Новая запись</DialogTitle>

      {/* form не используем: DateTimePicker и multiline-поля перехватывают Enter. */}
      <DialogContent sx={{ pt: DIALOG_CONTENT_PADDING_TOP }}>
        <Stack spacing={FIELD_GAP}>
          <UrlField
            autoFocus
            label={APPLICATION_FIELD_LABELS.vacancyUrl}
            value={values.vacancyUrl}
            maxLength={URL_MAX_LENGTH}
            isLoading={preview.isPending}
            onValueChange={(value) => {
              patchValues({ vacancyUrl: value });
            }}
            onBlur={handleVacancyUrlBlur}
          />

          <TextField
            required
            fullWidth
            label={APPLICATION_FIELD_LABELS.company}
            value={values.company}
            error={isCompanyTouched && isCompanyEmpty}
            helperText={isCompanyTouched && isCompanyEmpty ? COMPANY_REQUIRED_MESSAGE : undefined}
            onChange={handleCompanyChange}
            onBlur={handleCompanyBlur}
            slotProps={{ htmlInput: { maxLength: COMPANY_MAX_LENGTH } }}
          />

          <TextField
            fullWidth
            label={APPLICATION_FIELD_LABELS.position}
            value={values.position}
            onChange={handlePositionChange}
            slotProps={{ htmlInput: { maxLength: POSITION_MAX_LENGTH } }}
          />

          <UrlField
            label={APPLICATION_FIELD_LABELS.resumeUrl}
            value={values.resumeUrl}
            maxLength={URL_MAX_LENGTH}
            onValueChange={(value) => {
              patchValues({ resumeUrl: value });
            }}
          />

          <TextField
            fullWidth
            multiline
            minRows={MULTILINE_MIN_ROWS}
            maxRows={MULTILINE_MAX_ROWS_CONTACT}
            label={APPLICATION_FIELD_LABELS.employerContact}
            value={values.employerContact}
            onChange={handleEmployerContactChange}
            slotProps={{ htmlInput: { maxLength: EMPLOYER_CONTACT_MAX_LENGTH } }}
          />

          <Box sx={ROW_SX}>
            <FieldCell flex={FIELD_FLEX.hrInterviewAt}>
              <DateTimePicker
                label={APPLICATION_FIELD_LABELS.hrInterviewAt}
                value={toDayjsOrNull(values.hrInterviewAt)}
                format={DATE_TIME_DISPLAY_FORMAT}
                ampm={PICKER_AMPM}
                onChange={handleHrInterviewChange}
                slotProps={{
                  field: PICKER_FIELD_SLOT_PROPS,
                  textField: PICKER_TEXT_FIELD_SLOT_PROPS,
                }}
              />
            </FieldCell>

            <FieldCell flex={FIELD_FLEX.techInterviewAt}>
              <DateTimePicker
                label={APPLICATION_FIELD_LABELS.techInterviewAt}
                value={toDayjsOrNull(values.techInterviewAt)}
                format={DATE_TIME_DISPLAY_FORMAT}
                ampm={PICKER_AMPM}
                onChange={handleTechInterviewChange}
                slotProps={{
                  field: PICKER_FIELD_SLOT_PROPS,
                  textField: PICKER_TEXT_FIELD_SLOT_PROPS,
                }}
              />
            </FieldCell>
          </Box>

          <FormControl fullWidth>
            <InputLabel id={CREATE_DIALOG_RESULT_LABEL_ID}>
              {APPLICATION_FIELD_LABELS.result}
            </InputLabel>
            <Select<ApplicationResult>
              labelId={CREATE_DIALOG_RESULT_LABEL_ID}
              label={APPLICATION_FIELD_LABELS.result}
              value={values.result}
              onChange={handleResultChange}
            >
              {APPLICATION_RESULT_ORDER.map((result) => (
                <MenuItem key={result} value={result}>
                  {APPLICATION_RESULT_LABELS[result]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            multiline
            minRows={MULTILINE_MIN_ROWS}
            maxRows={MULTILINE_MAX_ROWS_NOTES}
            label={APPLICATION_FIELD_LABELS.notes}
            value={values.notes}
            onChange={handleNotesChange}
            slotProps={{ htmlInput: { maxLength: NOTES_MAX_LENGTH } }}
          />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button disabled={isSubmitting} onClick={onCancel}>
          Отмена
        </Button>

        <Button variant="contained" disabled={isSubmitDisabled} onClick={handleSubmit}>
          Добавить
        </Button>
      </DialogActions>
    </Dialog>
  );
}
