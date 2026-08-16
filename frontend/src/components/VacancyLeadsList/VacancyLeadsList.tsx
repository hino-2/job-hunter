import { Alert, Button, Skeleton, Stack } from '@mui/material';

import { ACCORDION_GAP, LIST_SKELETON_COUNT, SUMMARY_MIN_HEIGHT_PX } from '../../constants/layout.constants';
import {
  VACANCY_LEADS_EMPTY_DESCRIPTION,
  VACANCY_LEADS_EMPTY_FILTERED_DESCRIPTION,
  VACANCY_LEADS_EMPTY_FILTERED_TITLE,
  VACANCY_LEADS_EMPTY_HIDDEN_TITLE,
  VACANCY_LEADS_EMPTY_TITLE,
  VACANCY_LEADS_LIST_ERROR_MESSAGE,
  VACANCY_LEADS_RESET_FILTERS_LABEL,
  VACANCY_LEADS_RETRY_LABEL,
} from '../../constants/vacancy-search.constants';
import type { VacancyLeadsListProps } from './vacancy-leads-list.interfaces';
import { EmptyState } from '../EmptyState/EmptyState';
import { VacancyLeadAccordion } from '../VacancyLeadAccordion/VacancyLeadAccordion';

/** Список аккордеонов лидов и все его состояния: загрузка, ошибка, пусто, данные (§7.9.1). */
export function VacancyLeadsList({
  leads,
  isPending,
  isError,
  isSearchActive,
  isHiddenView,
  onRetry,
  onResetFilters,
  expandedIds,
  onToggle,
  onToggleHidden,
  applyingIds,
  onApply,
}: VacancyLeadsListProps) {
  if (isPending) {
    return (
      <Stack spacing={ACCORDION_GAP}>
        {Array.from({ length: LIST_SKELETON_COUNT }, (_unused, index) => (
          <Skeleton key={index} variant="rounded" height={SUMMARY_MIN_HEIGHT_PX} />
        ))}
      </Stack>
    );
  }

  if (isError) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" onClick={onRetry}>
            {VACANCY_LEADS_RETRY_LABEL}
          </Button>
        }
      >
        {VACANCY_LEADS_LIST_ERROR_MESSAGE}
      </Alert>
    );
  }

  if (leads.length === 0) {
    // Три разных пустых состояния (§7.9.1, §7.9.3): просмотр «Скрытые» — отдельная
    // коллекция и не имеет отношения к тому, был ли прогон поиска вообще; активный
    // текстовый поиск — предлагает сбросить фильтры; иначе — предложение запустить поиск.
    if (isHiddenView) {
      return <EmptyState title={VACANCY_LEADS_EMPTY_HIDDEN_TITLE} />;
    }

    return isSearchActive ? (
      <EmptyState
        title={VACANCY_LEADS_EMPTY_FILTERED_TITLE}
        description={VACANCY_LEADS_EMPTY_FILTERED_DESCRIPTION}
        actionLabel={VACANCY_LEADS_RESET_FILTERS_LABEL}
        onAction={onResetFilters}
      />
    ) : (
      <EmptyState title={VACANCY_LEADS_EMPTY_TITLE} description={VACANCY_LEADS_EMPTY_DESCRIPTION} />
    );
  }

  return (
    <Stack spacing={ACCORDION_GAP}>
      {leads.map((lead) => (
        <VacancyLeadAccordion
          key={lead.id}
          lead={lead}
          expanded={expandedIds.has(lead.id)}
          onToggle={onToggle}
          onToggleHidden={onToggleHidden}
          isApplying={applyingIds.has(lead.id)}
          onApply={onApply}
        />
      ))}
    </Stack>
  );
}
