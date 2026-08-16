import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Accordion, AccordionDetails, AccordionSummary, IconButton } from '@mui/material';
import { memo } from 'react';
import type { MouseEvent } from 'react';

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
import {
  COLLAPSE_VACANCY_LABEL,
  EXPAND_VACANCY_LABEL,
} from '../../constants/vacancy-search.constants';
import { toExternalHref } from '../../utils/url.utils';
import {
  ACCORDION_SLOT_PROPS,
  EXTERNAL_WINDOW_FEATURES,
  EXTERNAL_WINDOW_TARGET,
} from './vacancy-lead-accordion.constants';
import type { VacancyLeadAccordionProps } from './vacancy-lead-accordion.interfaces';
import { VacancyLeadFields } from '../VacancyLeadFields/VacancyLeadFields';
import { VacancyLeadSummaryRow } from '../VacancyLeadSummaryRow/VacancyLeadSummaryRow';

/**
 * Одна найденная вакансия — один Accordion (§7.9.1), те же правила, что у откликов
 * (§7.2): disableGutters, elevation={1}, mountOnEnter/unmountOnExit слотом transition,
 * AccordionSummary component="div" (внутри две кнопки).
 *
 * memo обязателен тем же приёмом, что ApplicationAccordion: без него сворачивание одной
 * записи перерисовывало бы весь список — React Compiler в проекте не подключён.
 */
export const VacancyLeadAccordion = memo(function VacancyLeadAccordion({
  lead,
  expanded,
  onToggle,
  onToggleHidden,
}: VacancyLeadAccordionProps) {
  const href = toExternalHref(lead.vacancyUrl);
  const expandLabel = expanded ? COLLAPSE_VACANCY_LABEL : EXPAND_VACANCY_LABEL;

  // Клик по шапке открывает вакансию, а не разворачивает запись (§7.9.1): описание
  // читается на источнике, раскрытые поля нужны реже. Поэтому у Accordion нет onChange —
  // иначе тот же клик ещё и переключал бы раскрытость.
  const handleSummaryClick = () => {
    if (href === null) {
      return;
    }

    window.open(href, EXTERNAL_WINDOW_TARGET, EXTERNAL_WINDOW_FEATURES);
  };

  // Раскрытие живёт только на стрелке справа; stopPropagation обязателен — без него
  // клик всплыл бы до шапки и открыл вакансию заодно с разворотом.
  const handleExpandClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onToggle(lead.id, !expanded);
  };

  return (
    <Accordion
      disableGutters
      elevation={ACCORDION_ELEVATION}
      expanded={expanded}
      slotProps={ACCORDION_SLOT_PROPS}
      sx={{ width: '100%' }}
    >
      <AccordionSummary
        component="div"
        onClick={handleSummaryClick}
        expandIcon={
          <IconButton aria-label={expandLabel} onClick={handleExpandClick}>
            <ExpandMoreIcon />
          </IconButton>
        }
        sx={{ minHeight: SUMMARY_MIN_HEIGHT_PX, px: SUMMARY_PADDING_X }}
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
        <VacancyLeadSummaryRow lead={lead} onToggleHidden={onToggleHidden} />
      </AccordionSummary>

      <AccordionDetails
        sx={{
          px: ACCORDION_DETAILS_PADDING_X,
          pt: ACCORDION_DETAILS_PADDING_TOP,
          pb: ACCORDION_DETAILS_PADDING_BOTTOM,
        }}
      >
        <VacancyLeadFields lead={lead} />
      </AccordionDetails>
    </Accordion>
  );
});
