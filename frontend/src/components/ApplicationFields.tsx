import { Box, FormControl, InputLabel, MenuItem, Select, Stack, TextField } from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import type { DateTimeValidationError, PickerChangeHandlerContext } from '@mui/x-date-pickers';
import type { Dayjs } from 'dayjs';
import type { ChangeEvent } from 'react';

import {
  APPLICATION_FIELD_LABELS,
  APPLICATION_RESULT_LABELS,
  APPLICATION_RESULT_ORDER,
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_ORDER,
  COMPANY_MAX_LENGTH,
  COMPANY_REQUIRED_MESSAGE,
  EMPLOYER_CONTACT_MAX_LENGTH,
  NOTES_MAX_LENGTH,
  POSITION_MAX_LENGTH,
  URL_MAX_LENGTH,
} from '../constants/application.constants';
import {
  DATE_TIME_DISPLAY_FORMAT,
  FIELD_FLEX,
  FIELD_GAP,
  MULTILINE_MAX_ROWS_CONTACT,
  MULTILINE_MAX_ROWS_NOTES,
  MULTILINE_MIN_ROWS,
} from '../constants/layout.constants';
import type {
  ApplicationResult,
  ApplicationStatus,
  EditableTextField,
} from '../types/application.type';
import { readTextFieldValue } from '../utils/application.utils';
import { isCommittableDate, toDayjsOrNull, toIsoOrNull } from '../utils/date.utils';
import {
  PICKER_AMPM,
  PICKER_FIELD_SLOT_PROPS,
  PICKER_TEXT_FIELD_SLOT_PROPS,
  RESULT_LABEL_ID_SUFFIX,
  ROW_SX,
  STATUS_LABEL_ID_SUFFIX,
} from './application-fields.constants';
import type { ApplicationFieldsProps } from './application-fields.interfaces';
import { FieldCell } from './FieldCell';
import { UrlField } from './UrlField';

/**
 * Содержимое AccordionDetails — ряды 1–3 полей §7.2.2 с автосейвом §7.3.
 *
 * Собственного состояния у компонента нет вовсе: показываемое значение приходит уже
 * смерженным с черновиком, а весь ввод уходит в handlers. Иначе правку пришлось бы
 * синхронизировать с пропами через useEffect (запрещает react-hooks/set-state-in-effect),
 * и она терялась бы при сворачивании аккордеона (§13.10.7).
 */
export function ApplicationFields({ application, savedFields, handlers }: ApplicationFieldsProps) {
  const { id } = application;
  const statusLabelId = `${id}${STATUS_LABEL_ID_SUFFIX}`;
  const resultLabelId = `${id}${RESULT_LABEL_ID_SUFFIX}`;
  const company = readTextFieldValue(application, 'company');
  const isCompanyEmpty = company.trim().length === 0;

  const changeText =
    (field: EditableTextField) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      handlers.changeText(id, field, event.target.value);
    };

  const changeUrl = (field: EditableTextField) => (value: string) => {
    handlers.changeText(id, field, value);
  };

  const blurText = (field: EditableTextField) => () => {
    handlers.blurText(id, field);
  };

  const handleStatusChange = (event: SelectChangeEvent<ApplicationStatus>) => {
    handlers.commit(id, { status: event.target.value });
  };

  const handleResultChange = (event: SelectChangeEvent<ApplicationResult>) => {
    handlers.commit(id, { result: event.target.value });
  };

  const handleHrInterviewChange = (
    value: Dayjs | null,
    context: PickerChangeHandlerContext<DateTimeValidationError>,
  ) => {
    if (!isCommittableDate(value, context.validationError)) {
      return;
    }

    handlers.commit(id, { hrInterviewAt: toIsoOrNull(value) });
  };

  const handleTechInterviewChange = (
    value: Dayjs | null,
    context: PickerChangeHandlerContext<DateTimeValidationError>,
  ) => {
    if (!isCommittableDate(value, context.validationError)) {
      return;
    }

    handlers.commit(id, { techInterviewAt: toIsoOrNull(value) });
  };

  return (
    <Stack spacing={FIELD_GAP}>
      <Box sx={ROW_SX}>
        <FieldCell flex={FIELD_FLEX.company} isSaved={savedFields.has('company')}>
          <TextField
            required
            fullWidth
            label={APPLICATION_FIELD_LABELS.company}
            value={company}
            error={isCompanyEmpty}
            helperText={isCompanyEmpty ? COMPANY_REQUIRED_MESSAGE : undefined}
            onChange={changeText('company')}
            onBlur={blurText('company')}
            slotProps={{ htmlInput: { maxLength: COMPANY_MAX_LENGTH } }}
          />
        </FieldCell>

        <FieldCell flex={FIELD_FLEX.position} isSaved={savedFields.has('position')}>
          <TextField
            fullWidth
            label={APPLICATION_FIELD_LABELS.position}
            value={readTextFieldValue(application, 'position')}
            onChange={changeText('position')}
            onBlur={blurText('position')}
            slotProps={{ htmlInput: { maxLength: POSITION_MAX_LENGTH } }}
          />
        </FieldCell>

        <FieldCell flex={FIELD_FLEX.status} isSaved={savedFields.has('status')}>
          <FormControl fullWidth>
            <InputLabel id={statusLabelId}>{APPLICATION_FIELD_LABELS.status}</InputLabel>
            <Select<ApplicationStatus>
              labelId={statusLabelId}
              label={APPLICATION_FIELD_LABELS.status}
              value={application.status}
              onChange={handleStatusChange}
            >
              {APPLICATION_STATUS_ORDER.map((status) => (
                <MenuItem key={status} value={status}>
                  {APPLICATION_STATUS_LABELS[status]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </FieldCell>

        <FieldCell flex={FIELD_FLEX.result} isSaved={savedFields.has('result')}>
          <FormControl fullWidth>
            <InputLabel id={resultLabelId}>{APPLICATION_FIELD_LABELS.result}</InputLabel>
            <Select<ApplicationResult>
              labelId={resultLabelId}
              label={APPLICATION_FIELD_LABELS.result}
              value={application.result}
              onChange={handleResultChange}
            >
              {APPLICATION_RESULT_ORDER.map((result) => (
                <MenuItem key={result} value={result}>
                  {APPLICATION_RESULT_LABELS[result]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </FieldCell>
      </Box>

      <Box sx={ROW_SX}>
        <FieldCell flex={FIELD_FLEX.vacancyUrl} isSaved={savedFields.has('vacancyUrl')}>
          <UrlField
            label={APPLICATION_FIELD_LABELS.vacancyUrl}
            value={readTextFieldValue(application, 'vacancyUrl')}
            maxLength={URL_MAX_LENGTH}
            onValueChange={changeUrl('vacancyUrl')}
            onBlur={blurText('vacancyUrl')}
          />
        </FieldCell>

        <FieldCell flex={FIELD_FLEX.resumeUrl} isSaved={savedFields.has('resumeUrl')}>
          <UrlField
            label={APPLICATION_FIELD_LABELS.resumeUrl}
            value={readTextFieldValue(application, 'resumeUrl')}
            maxLength={URL_MAX_LENGTH}
            onValueChange={changeUrl('resumeUrl')}
            onBlur={blurText('resumeUrl')}
          />
        </FieldCell>

        <FieldCell flex={FIELD_FLEX.hrInterviewAt} isSaved={savedFields.has('hrInterviewAt')}>
          <DateTimePicker
            label={APPLICATION_FIELD_LABELS.hrInterviewAt}
            value={toDayjsOrNull(application.hrInterviewAt)}
            format={DATE_TIME_DISPLAY_FORMAT}
            ampm={PICKER_AMPM}
            onChange={handleHrInterviewChange}
            slotProps={{
              field: PICKER_FIELD_SLOT_PROPS,
              textField: PICKER_TEXT_FIELD_SLOT_PROPS,
            }}
          />
        </FieldCell>

        <FieldCell flex={FIELD_FLEX.techInterviewAt} isSaved={savedFields.has('techInterviewAt')}>
          <DateTimePicker
            label={APPLICATION_FIELD_LABELS.techInterviewAt}
            value={toDayjsOrNull(application.techInterviewAt)}
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

      <Box sx={ROW_SX}>
        <FieldCell flex={FIELD_FLEX.employerContact} isSaved={savedFields.has('employerContact')}>
          <TextField
            fullWidth
            multiline
            minRows={MULTILINE_MIN_ROWS}
            maxRows={MULTILINE_MAX_ROWS_CONTACT}
            label={APPLICATION_FIELD_LABELS.employerContact}
            value={readTextFieldValue(application, 'employerContact')}
            onChange={changeText('employerContact')}
            onBlur={blurText('employerContact')}
            slotProps={{ htmlInput: { maxLength: EMPLOYER_CONTACT_MAX_LENGTH } }}
          />
        </FieldCell>

        <FieldCell flex={FIELD_FLEX.notes} isSaved={savedFields.has('notes')}>
          <TextField
            fullWidth
            multiline
            minRows={MULTILINE_MIN_ROWS}
            maxRows={MULTILINE_MAX_ROWS_NOTES}
            label={APPLICATION_FIELD_LABELS.notes}
            value={readTextFieldValue(application, 'notes')}
            onChange={changeText('notes')}
            onBlur={blurText('notes')}
            slotProps={{ htmlInput: { maxLength: NOTES_MAX_LENGTH } }}
          />
        </FieldCell>
      </Box>
    </Stack>
  );
}
