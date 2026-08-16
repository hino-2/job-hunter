import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Avatar, Box, Button, IconButton, Tooltip, Typography } from '@mui/material';
import { memo } from 'react';
import type { MouseEvent } from 'react';

import { VACANCY_LEADS_ENDPOINT } from '../../constants/api.constants';
import {
  FIELD_GAP,
  SUMMARY_LOGO_FONT_SIZE,
  SUMMARY_LOGO_GAP,
  SUMMARY_LOGO_SIZE_PX,
  SUMMARY_TEXT_MIN_WIDTH_PX,
  VACANCY_LEAD_SUMMARY_FLEX,
} from '../../constants/layout.constants';
import {
  HIDE_VACANCY_LABEL,
  OPEN_VACANCY_LABEL,
  RESTORE_VACANCY_LABEL,
} from '../../constants/vacancy-search.constants';
import { buildCompanyInitial, buildCompanyLogoUrl } from '../../utils/company-logo.utils';
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
  const logoSrc = lead.hasCompanyLogo
    ? buildCompanyLogoUrl(VACANCY_LEADS_ENDPOINT, lead.id)
    : undefined;

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

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: SUMMARY_LOGO_GAP,
          flex: VACANCY_LEAD_SUMMARY_FLEX.company,
          minWidth: SUMMARY_TEXT_MIN_WIDTH_PX,
        }}
      >
        <Avatar
          variant="rounded"
          alt=""
          src={logoSrc}
          sx={{
            width: SUMMARY_LOGO_SIZE_PX,
            height: SUMMARY_LOGO_SIZE_PX,
            fontSize: SUMMARY_LOGO_FONT_SIZE,
            flex: VACANCY_LEAD_SUMMARY_FLEX.auto,
          }}
        >
          {buildCompanyInitial(lead.company)}
        </Avatar>

        <Typography
          noWrap
          color="text.secondary"
          sx={{ flex: VACANCY_LEAD_SUMMARY_FLEX.companyText, minWidth: SUMMARY_TEXT_MIN_WIDTH_PX }}
        >
          {lead.company}
        </Typography>
      </Box>

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

      {/*
       * Обычная кнопка с подписью вместо иконки: действие скрытия используется чаще
       * остальных, подпись читается без наведения — поэтому Tooltip здесь не нужен.
       * variant="contained" без color — как у остальных кнопок действия проекта, цвет
       * берётся из темы (`primary.main`, серый).
       */}
      <Button
        variant="contained"
        size="medium"
        onClick={handleToggleHidden}
        sx={{ flex: VACANCY_LEAD_SUMMARY_FLEX.auto }}
      >
        {lead.hidden ? RESTORE_VACANCY_LABEL : HIDE_VACANCY_LABEL}
      </Button>
    </Box>
  );
});
