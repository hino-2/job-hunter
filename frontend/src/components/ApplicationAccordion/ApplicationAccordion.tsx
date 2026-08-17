import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Accordion, AccordionDetails, AccordionSummary } from '@mui/material';
import { memo } from 'react';
import type { SyntheticEvent } from 'react';

import { APPLICATION_RESULT, APPLICATION_STATUS } from '../../constants/application.constants';
import {
  ACCORDION_DETAILS_PADDING_BOTTOM,
  ACCORDION_DETAILS_PADDING_TOP,
  ACCORDION_DETAILS_PADDING_X,
  ACCORDION_ELEVATION,
  SUMMARY_CONTENT_MARGIN_Y,
  SUMMARY_MIN_HEIGHT_PX,
  SUMMARY_PADDING_X,
  SUMMARY_TEXT_MIN_WIDTH_PX,
} from '../../constants/layout.constants';
import { mergeApplicationWithPending } from '../../utils/application.utils';
import { ACCORDION_SLOT_PROPS } from './application-accordion.constants';
import type { ApplicationAccordionProps } from './application-accordion.interfaces';
import { ApplicationFields } from '../ApplicationFields/ApplicationFields';
import { ApplicationSummaryRow } from '../ApplicationSummaryRow/ApplicationSummaryRow';

/**
 * Одна вакансия — один Accordion во всю ширину (§7.2). Таблиц в проекте нет (§13.10.1).
 *
 * memo обязателен: без него каждое нажатие клавиши в любом поле перерисовывало бы все
 * аккордеоны списка — React Compiler в проекте не подключён (vite.config.ts берёт
 * плагин react() без babel-плагина компилятора).
 */
export const ApplicationAccordion = memo(function ApplicationAccordion({
  application,
  pending,
  savedFields,
  handlers,
  expanded,
  onToggle,
  isSyncing,
  onSync,
  onRejectByCompany,
}: ApplicationAccordionProps) {
  // Шапка и поля получают одну и ту же смерженную запись — отсюда §13.10.8 «правка
  // компании/должности сразу видна в свёрнутой шапке» без единой дополнительной строки.
  const merged = mergeApplicationWithPending(application, pending);
  const isClosed =
    merged.status === APPLICATION_STATUS.CLOSED ||
    merged.result === APPLICATION_RESULT.DECLINED_BY_ME ||
    merged.result === APPLICATION_RESULT.REJECTED_BY_COMPANY;

  const handleChange = (_event: SyntheticEvent, isExpanded: boolean) => {
    onToggle(merged.id, isExpanded);
  };

  return (
    <Accordion
      disableGutters
      elevation={ACCORDION_ELEVATION}
      expanded={expanded}
      onChange={handleChange}
      // В MUI v9 пропа TransitionProps больше нет — те же опции задаются слотом transition.
      // mountOnEnter + unmountOnExit: false — см. доккомментарий ACCORDION_SLOT_PROPS.
      slotProps={ACCORDION_SLOT_PROPS}
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
          bgcolor: isClosed ? '#01010133' : undefined,
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
        <ApplicationSummaryRow
          application={merged}
          isSyncing={isSyncing}
          onSync={onSync}
          onRejectByCompany={onRejectByCompany}
        />
      </AccordionSummary>

      <AccordionDetails
        sx={{
          px: ACCORDION_DETAILS_PADDING_X,
          pt: ACCORDION_DETAILS_PADDING_TOP,
          pb: ACCORDION_DETAILS_PADDING_BOTTOM,
        }}
      >
        <ApplicationFields application={merged} savedFields={savedFields} handlers={handlers} />
      </AccordionDetails>
    </Accordion>
  );
});
