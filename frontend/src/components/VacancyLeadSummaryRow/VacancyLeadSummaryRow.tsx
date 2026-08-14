import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { memo } from 'react';
import type { MouseEvent } from 'react';

import {
  FIELD_GAP,
  SUMMARY_TEXT_MIN_WIDTH_PX,
  VACANCY_LEAD_SUMMARY_FLEX,
} from '../../constants/layout.constants';
import {
  HIDE_VACANCY_LABEL,
  OPEN_VACANCY_LABEL,
  RESTORE_VACANCY_LABEL,
} from '../../constants/vacancy-search.constants';
import { toExternalHref } from '../../utils/url.utils';
import { formatPublishedOnShort, formatSalaryShort } from '../../utils/vacancy-lead.utils';
import type { VacancyLeadSummaryRowProps } from './vacancy-lead-summary-row.interfaces';

/**
 * Содержимое AccordionSummary одного лида (§7.9.1): дата · должность · компания ·
 * короткая зарплата, кнопки ↗ и Скрыть/Вернуть. Если зарплаты у вакансии нет, её ячейка
 * остаётся пустой (§7.9.1) — прочерк здесь не показываем, в отличие от откликов.
 *
 * memo обязателен тем же приёмом, что ApplicationSummaryRow: шапка не зависит
 * от `expanded`, поэтому обязана отбиваться memo при переключении раскрытости соседей.
 */
export const VacancyLeadSummaryRow = memo(function VacancyLeadSummaryRow({
  lead,
  onToggleHidden,
}: VacancyLeadSummaryRowProps) {
  const salary = formatSalaryShort(lead);
  const href = toExternalHref(lead.vacancyUrl);

  // stopPropagation обязателен (§7.9.1): без него клик по кнопке всплыл бы до
  // AccordionSummary и переключил раскрытость (§13.10.3). Оборачиваем в span, а не
  // вешаем прямо на IconButton/ссылку: у disabled IconButton pointer-events: none,
  // и клик по нему провалился бы в шапку мимо собственного onClick.
  const handleOpenWrapperClick = (event: MouseEvent<HTMLSpanElement>) => {
    event.stopPropagation();
  };

  const handleToggleHidden = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onToggleHidden(lead.id, !lead.hidden);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: FIELD_GAP,
        flexWrap: 'wrap',
        width: '100%',
        minWidth: SUMMARY_TEXT_MIN_WIDTH_PX,
      }}
    >
      <Typography
        noWrap
        color="text.secondary"
        sx={{ flex: VACANCY_LEAD_SUMMARY_FLEX.publishedOn, minWidth: SUMMARY_TEXT_MIN_WIDTH_PX }}
      >
        {formatPublishedOnShort(lead.publishedOn)}
      </Typography>

      <Typography
        noWrap
        sx={{
          flex: VACANCY_LEAD_SUMMARY_FLEX.position,
          minWidth: SUMMARY_TEXT_MIN_WIDTH_PX,
          fontWeight: 'bold',
        }}
      >
        {lead.position}
      </Typography>

      <Typography
        noWrap
        color="text.secondary"
        sx={{ flex: VACANCY_LEAD_SUMMARY_FLEX.company, minWidth: SUMMARY_TEXT_MIN_WIDTH_PX }}
      >
        {lead.company}
      </Typography>

      {/*
       * Ячейка зарплаты рендерится всегда, даже пустой: `position` и `company` растут
       * (`flex-grow: 1`), поэтому пропущенная ячейка отдавала бы им свои 160px и должность
       * становилась шире — компания в строках без зарплаты уезжала вправо и колонки
       * не выстраивались. Прочерк внутрь не пишем (§7.9.1) — резервируется только место.
       */}
      <Typography
        noWrap
        sx={{ flex: VACANCY_LEAD_SUMMARY_FLEX.salary, minWidth: SUMMARY_TEXT_MIN_WIDTH_PX }}
      >
        {salary}
      </Typography>

      <Tooltip title={OPEN_VACANCY_LABEL}>
        <Box
          component="span"
          onClick={handleOpenWrapperClick}
          sx={{ flex: VACANCY_LEAD_SUMMARY_FLEX.auto, display: 'inline-flex' }}
        >
          {href === null ? (
            // disabled нельзя вешать на IconButton component="a" — см. UrlField.
            <IconButton disabled aria-label={OPEN_VACANCY_LABEL}>
              <OpenInNewIcon fontSize="small" />
            </IconButton>
          ) : (
            <IconButton
              component="a"
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={OPEN_VACANCY_LABEL}
            >
              <OpenInNewIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      </Tooltip>

      <Tooltip title={lead.hidden ? RESTORE_VACANCY_LABEL : HIDE_VACANCY_LABEL}>
        <IconButton
          aria-label={lead.hidden ? RESTORE_VACANCY_LABEL : HIDE_VACANCY_LABEL}
          onClick={handleToggleHidden}
          sx={{ flex: VACANCY_LEAD_SUMMARY_FLEX.auto }}
        >
          {lead.hidden ? (
            <VisibilityOutlinedIcon fontSize="small" />
          ) : (
            <VisibilityOffOutlinedIcon fontSize="small" />
          )}
        </IconButton>
      </Tooltip>
    </Box>
  );
});
