import { Box, Stack, Typography } from '@mui/material';
import { memo } from 'react';
import type { ReactNode } from 'react';

import { VACANCY_LEAD_FIELD_LABELS } from '../../constants/vacancy-search.constants';
import { FIELD_GAP, ROW_SX, VACANCY_LEAD_FIELD_FLEX } from '../../constants/layout.constants';
import {
  formatEmploymentForm,
  formatExperience,
  formatFirstSeenAt,
  formatMatchedKeywords,
  formatPublishedAtFull,
  formatSalaryFull,
  formatWorkFormats,
} from '../../utils/vacancy-lead.utils';
import type { ReadOnlyCellProps, VacancyLeadFieldsProps } from './vacancy-lead-fields.interfaces';
import { FieldCell } from '../FieldCell/FieldCell';

/**
 * Читаемая ячейка раскрытого лида (§7.9.1): подпись + значение, без формы ввода —
 * все поля read-only, правки полей выдачи здесь нет и быть не может.
 */
function ReadOnlyCell({ flex, label, value }: ReadOnlyCellProps): ReactNode {
  return (
    <FieldCell flex={flex}>
      <Stack spacing={0}>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="body2">{value}</Typography>
      </Stack>
    </FieldCell>
  );
}

/**
 * Содержимое AccordionDetails лида (§7.9.1, §4.11.3) — две строки полей выдачи, только
 * чтение. Пустые поля не рендерятся вовсе (а не показываются прочерком, в отличие
 * от откликов §7.8): у половины вакансий hh.ru зарплаты нет вообще.
 *
 * memo — не микрооптимизация, а защита от лишних измерений: тем же приёмом, что
 * ApplicationFields, компонент обязан отбиваться memo, пока сворачивание/раскрытие
 * соседних записей перерисовывает список.
 */
export const VacancyLeadFields = memo(function VacancyLeadFields({ lead }: VacancyLeadFieldsProps) {
  const salary = formatSalaryFull(lead);
  const experience = formatExperience(lead.experience);
  const employmentForm = formatEmploymentForm(lead.employmentForm);
  const workFormats = formatWorkFormats(lead.workFormats);
  const publishedAtFull = formatPublishedAtFull(lead.publishedAt);
  const firstSeenAt = formatFirstSeenAt(lead.firstSeenAt);
  const matchedKeywords = formatMatchedKeywords(lead.matchedKeywords);

  return (
    <Stack spacing={FIELD_GAP}>
      <Box sx={ROW_SX}>
        {salary !== null ? (
          <ReadOnlyCell
            flex={VACANCY_LEAD_FIELD_FLEX.salary}
            label={VACANCY_LEAD_FIELD_LABELS.salary}
            value={salary}
          />
        ) : null}

        {lead.areaName !== null ? (
          <ReadOnlyCell
            flex={VACANCY_LEAD_FIELD_FLEX.area}
            label={VACANCY_LEAD_FIELD_LABELS.area}
            value={lead.areaName}
          />
        ) : null}

        {experience !== null ? (
          <ReadOnlyCell
            flex={VACANCY_LEAD_FIELD_FLEX.experience}
            label={VACANCY_LEAD_FIELD_LABELS.experience}
            value={experience}
          />
        ) : null}

        {employmentForm !== null ? (
          <ReadOnlyCell
            flex={VACANCY_LEAD_FIELD_FLEX.employmentForm}
            label={VACANCY_LEAD_FIELD_LABELS.employmentForm}
            value={employmentForm}
          />
        ) : null}

        {workFormats !== null ? (
          <ReadOnlyCell
            flex={VACANCY_LEAD_FIELD_FLEX.workFormats}
            label={VACANCY_LEAD_FIELD_LABELS.workFormats}
            value={workFormats}
          />
        ) : null}
      </Box>

      <Box sx={ROW_SX}>
        {publishedAtFull !== null ? (
          <ReadOnlyCell
            flex={VACANCY_LEAD_FIELD_FLEX.publishedAtFull}
            label={VACANCY_LEAD_FIELD_LABELS.publishedAtFull}
            value={publishedAtFull}
          />
        ) : null}

        <ReadOnlyCell
          flex={VACANCY_LEAD_FIELD_FLEX.firstSeenAt}
          label={VACANCY_LEAD_FIELD_LABELS.firstSeenAt}
          value={firstSeenAt}
        />

        {matchedKeywords !== null ? (
          <ReadOnlyCell
            flex={VACANCY_LEAD_FIELD_FLEX.matchedKeywords}
            label={VACANCY_LEAD_FIELD_LABELS.matchedKeywords}
            value={matchedKeywords}
          />
        ) : null}

        {lead.aiTitleReason !== null ? (
          <ReadOnlyCell
            flex={VACANCY_LEAD_FIELD_FLEX.aiTitleReason}
            label={VACANCY_LEAD_FIELD_LABELS.aiTitleReason}
            value={lead.aiTitleReason}
          />
        ) : null}

        {lead.aiDescriptionReason !== null ? (
          <ReadOnlyCell
            flex={VACANCY_LEAD_FIELD_FLEX.aiDescriptionReason}
            label={VACANCY_LEAD_FIELD_LABELS.aiDescriptionReason}
            value={lead.aiDescriptionReason}
          />
        ) : null}
      </Box>
    </Stack>
  );
});
