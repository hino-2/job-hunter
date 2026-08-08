import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Accordion, AccordionDetails, AccordionSummary, Typography } from '@mui/material';
import type { SyntheticEvent } from 'react';

import { APPLICATION_STATUS } from '../constants/application.constants';
import {
  ACCORDION_DETAILS_PADDING_BOTTOM,
  ACCORDION_DETAILS_PADDING_TOP,
  ACCORDION_DETAILS_PADDING_X,
  ACCORDION_ELEVATION,
  SUMMARY_CONTENT_MARGIN_Y,
  SUMMARY_MIN_HEIGHT_PX,
  SUMMARY_PADDING_X,
  SUMMARY_TEXT_MIN_WIDTH_PX,
} from '../constants/layout.constants';
import type { ApplicationAccordionProps } from './application-accordion.interfaces';
import { ApplicationSummaryRow } from './ApplicationSummaryRow';

/** Одна вакансия — один Accordion во всю ширину (§7.2). Таблиц в проекте нет (§13.10.1). */
export function ApplicationAccordion({
  application,
  expanded,
  onToggle,
  onSync,
  onDelete,
}: ApplicationAccordionProps) {
  const isClosed = application.status === APPLICATION_STATUS.CLOSED;

  const handleChange = (_event: SyntheticEvent, isExpanded: boolean) => {
    onToggle(application.id, isExpanded);
  };

  return (
    <Accordion
      disableGutters
      elevation={ACCORDION_ELEVATION}
      expanded={expanded}
      onChange={handleChange}
      // В MUI v9 пропа TransitionProps больше нет — те же опции задаются слотом transition.
      // unmountOnExit выключен, чтобы шаг 8 не терял фокус и несохранённый ввод (§7.2).
      slotProps={{ transition: { unmountOnExit: false } }}
      sx={{ width: '100%' }}
    >
      <AccordionSummary
        // Без component="div" AccordionSummary рендерится как <button>, а внутри у нас
        // ещё две кнопки: невалидный HTML и предупреждение React о вложенности.
        // ButtonBase при этом остаётся, поэтому клавиатурная активация не теряется.
        component="div"
        expandIcon={<ExpandMoreIcon />}
        sx={{
          minHeight: SUMMARY_MIN_HEIGHT_PX,
          px: SUMMARY_PADDING_X,
          // Приглушение закрытой записи (§7.2.3).
          bgcolor: isClosed ? 'action.hover' : undefined,
        }}
        slotProps={{
          content: {
            sx: {
              my: SUMMARY_CONTENT_MARGIN_Y,
              minWidth: SUMMARY_TEXT_MIN_WIDTH_PX,
              overflow: 'hidden',
            },
          },
        }}
      >
        <ApplicationSummaryRow application={application} onSync={onSync} onDelete={onDelete} />
      </AccordionSummary>

      <AccordionDetails
        sx={{
          px: ACCORDION_DETAILS_PADDING_X,
          pt: ACCORDION_DETAILS_PADDING_TOP,
          pb: ACCORDION_DETAILS_PADDING_BOTTOM,
        }}
      >
        {/* TODO(шаг 8): поля ввода рядами 1–3 по §7.2.2 с автосейвом по §7.3. */}
        <Typography variant="body2" color="text.secondary">
          Поля появятся на шаге 8 (§7.2.2)
        </Typography>
      </AccordionDetails>
    </Accordion>
  );
}
