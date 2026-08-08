import { Box, Container, Stack } from '@mui/material';
import { useMemo, useState } from 'react';

import { AppHeader } from './components/AppHeader';
import { ApplicationsList } from './components/ApplicationsList';
import { FilterBar } from './components/FilterBar';
import { DEFAULT_APPLICATION_FILTERS, EMPTY_APPLICATIONS } from './constants/application.constants';
import { CONTAINER_PADDING_X, CONTAINER_PADDING_Y, FIELD_GAP } from './constants/layout.constants';
import { SEARCH_DEBOUNCE_MS } from './constants/query.constants';
import { useApplications, useApplicationsCounts } from './hooks/useApplications';
import { useDebouncedValue } from './hooks/useDebouncedValue';
import { useExpandedIds } from './hooks/useExpandedIds';
import type { ApplicationsFilters } from './types/application.interfaces';
import { isFilterActive } from './utils/application.utils';

/**
 * Единственный экран приложения (§7.1). Здесь живёт всё локальное состояние: фильтры
 * и раскрытость аккордеонов. Серверные данные — только в React Query, глобального
 * стора в проекте нет и не заводим (§2.2).
 */
export function App() {
  const [filters, setFilters] = useState<ApplicationsFilters>(DEFAULT_APPLICATION_FILTERS);
  const debouncedSearch = useDebouncedValue(filters.search, SEARCH_DEBOUNCE_MS);
  // Дебаунсится только поиск: переключение статуса и сортировки применяется мгновенно.
  // Опустошение строки поиска — тоже мгновенно, иначе «Сбросить фильтры» успевает сходить
  // за данными со старым, уже отменённым запросом и на 300 мс показать скелетоны.
  const effectiveSearch = filters.search.trim().length === 0 ? filters.search : debouncedSearch;
  const effectiveFilters = useMemo<ApplicationsFilters>(
    () => ({ ...filters, search: effectiveSearch }),
    [filters, effectiveSearch],
  );
  const applications = useApplications(effectiveFilters);
  const counts = useApplicationsCounts();
  const expanded = useExpandedIds();

  const items = applications.data ?? EMPTY_APPLICATIONS;
  const ids = useMemo(() => items.map((item) => item.id), [items]);
  const isAllExpanded = expanded.areAllExpanded(ids);

  const handleToggleExpandAll = () => {
    if (isAllExpanded) {
      expanded.collapseAll();
    } else {
      expanded.expandAll(ids);
    }
  };

  const handleRetry = () => {
    void applications.refetch();
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_APPLICATION_FILTERS);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppHeader
        openCount={counts.data?.open ?? 0}
        totalCount={counts.data?.total ?? 0}
        // Именно «чисел нет», а не «идёт загрузка»: при ошибке запроса isPending уже false,
        // а data всё ещё undefined — и счётчик показал бы достоверно выглядящее «0 / 0».
        isCountsUnknown={counts.data === undefined}
      />

      <Container maxWidth={false} sx={{ px: CONTAINER_PADDING_X, py: CONTAINER_PADDING_Y }}>
        <Stack spacing={FIELD_GAP}>
          <FilterBar
            filters={filters}
            onFiltersChange={setFilters}
            isAllExpanded={isAllExpanded}
            onToggleExpandAll={handleToggleExpandAll}
          />

          <ApplicationsList
            applications={items}
            isPending={applications.isPending}
            isError={applications.isError}
            isFilterActive={isFilterActive(effectiveFilters)}
            onRetry={handleRetry}
            onResetFilters={handleResetFilters}
            isExpanded={expanded.isExpanded}
            onToggle={expanded.toggle}
          />
        </Stack>
      </Container>
    </Box>
  );
}
