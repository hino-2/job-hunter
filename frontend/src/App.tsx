import { Box, Container, Stack } from '@mui/material';
import { useCallback, useMemo, useState } from 'react';

import { AppHeader } from './components/AppHeader';
import { ApplicationsList } from './components/ApplicationsList';
import { FilterBar } from './components/FilterBar';
import { NotificationSnackbar } from './components/NotificationSnackbar';
import { DEFAULT_APPLICATION_FILTERS, EMPTY_APPLICATIONS } from './constants/application.constants';
import { CONTAINER_PADDING_X, CONTAINER_PADDING_Y, FIELD_GAP } from './constants/layout.constants';
import { SEARCH_DEBOUNCE_MS } from './constants/query.constants';
import { useApplications, useApplicationsCounts } from './hooks/useApplications';
import { useDebouncedValue } from './hooks/useDebouncedValue';
import { useExpandedIds } from './hooks/useExpandedIds';
import { useInlineEdits } from './hooks/useInlineEdits';
import { useNotification } from './hooks/useNotification';
import type { ApplicationsFilters } from './types/application.interfaces';
import { isFilterActive } from './utils/application.utils';

/**
 * Единственный экран приложения (§7.1). Здесь живёт всё локальное состояние: фильтры,
 * раскрытость аккордеонов, несохранённые правки и уведомление. Серверные данные — только
 * в React Query, глобального стора в проекте нет и не заводим (§2.2).
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
  const notification = useNotification();
  const edits = useInlineEdits({ onError: notification.notifyError });

  const items = applications.data ?? EMPTY_APPLICATIONS;
  const ids = useMemo(() => items.map((item) => item.id), [items]);
  const isAllExpanded = expanded.areAllExpanded(ids);

  // §13.10.7: несохранённая правка сначала отправляется и только потом сворачивается.
  // Ссылка обработчика меняется вместе с expanded, то есть только на раскрытии
  // и сворачивании; набор текста её не трогает, поэтому memo на аккордеонах работает.
  const handleToggle = useCallback(
    (id: string, isExpanded: boolean) => {
      if (!isExpanded) {
        edits.handlers.flush(id);
      }

      expanded.toggle(id, isExpanded);
    },
    [edits.handlers, expanded],
  );

  const handleToggleExpandAll = () => {
    if (isAllExpanded) {
      edits.handlers.flushAll();
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
            onToggle={handleToggle}
            pendingById={edits.pendingById}
            savedById={edits.savedById}
            editHandlers={edits.handlers}
          />
        </Stack>
      </Container>

      <NotificationSnackbar
        notification={notification.notification}
        onClose={notification.dismiss}
      />
    </Box>
  );
}
