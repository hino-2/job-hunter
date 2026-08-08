import { Box, Container, Stack } from '@mui/material';
import { useCallback, useMemo, useState } from 'react';

import { AppHeader } from './components/AppHeader';
import { ApplicationsList } from './components/ApplicationsList';
import { ConfirmDeleteDialog } from './components/ConfirmDeleteDialog';
import { CreateApplicationDialog } from './components/CreateApplicationDialog';
import { FilterBar } from './components/FilterBar';
import { NotificationSnackbar } from './components/NotificationSnackbar';
import { SyncSummaryAlert } from './components/SyncSummaryAlert';
import {
  CREATE_ERROR_FALLBACK_MESSAGE,
  CREATE_SUCCESS_MESSAGE,
  DEFAULT_APPLICATION_FILTERS,
  DELETE_ERROR_FALLBACK_MESSAGE,
  DELETE_SUCCESS_MESSAGE,
  EMPTY_APPLICATIONS,
  PREVIEW_ERROR_FALLBACK_MESSAGE,
  SYNC_OUTCOME_LABELS,
} from './constants/application.constants';
import { HTTP_STATUS_NOT_FOUND } from './constants/api.constants';
import { CONTAINER_PADDING_X, CONTAINER_PADDING_Y, FIELD_GAP } from './constants/layout.constants';
import { NOTIFICATION_SEVERITY } from './constants/notification.constants';
import { SEARCH_DEBOUNCE_MS } from './constants/query.constants';
import {
  SYNC_ALL_ERROR_FALLBACK_MESSAGE,
  SYNC_ERROR_FALLBACK_MESSAGE,
  SYNC_OUTCOME_NOTIFICATION_SEVERITY,
} from './constants/sync.constants';
import { useApplications, useApplicationsCounts } from './hooks/useApplications';
import { useCreateApplication } from './hooks/useCreateApplication';
import { useDebouncedValue } from './hooks/useDebouncedValue';
import { useDeleteApplication } from './hooks/useDeleteApplication';
import { useExpandedIds } from './hooks/useExpandedIds';
import { useInlineEdits } from './hooks/useInlineEdits';
import { useNotification } from './hooks/useNotification';
import { useSyncAllOpen } from './hooks/useSyncAllOpen';
import { useSyncApplication } from './hooks/useSyncApplication';
import type {
  Application,
  ApplicationCreate,
  ApplicationsFilters,
} from './types/application.interfaces';
import type { SyncResult, SyncSummary } from './types/sync.interfaces';
import { isFilterActive } from './utils/application.utils';
import { extractApiErrorMessage, extractApiErrorStatus } from './utils/error.utils';

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
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [syncSummary, setSyncSummary] = useState<SyncSummary | null>(null);

  const items = applications.data ?? EMPTY_APPLICATIONS;
  const ids = useMemo(() => items.map((item) => item.id), [items]);
  const isAllExpanded = expanded.areAllExpanded(ids);
  const deleteTarget = useMemo(
    () => items.find((item) => item.id === deleteTargetId) ?? null,
    [items, deleteTargetId],
  );

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

  const handleAdd = useCallback(() => {
    setCreateOpen(true);
  }, []);

  // useCallback обязателен: колбэк уходит пропом в каждый memo-аккордеон списка (§9).
  const handleDeleteRequest = useCallback((id: string) => {
    setDeleteTargetId(id);
  }, []);

  const handleCreateCancel = useCallback(() => {
    setCreateOpen(false);
  }, []);

  const handleDeleteCancel = useCallback(() => {
    setDeleteTargetId(null);
  }, []);

  const handleCreated = useCallback(
    (created: Application) => {
      setCreateOpen(false);
      expanded.expand(created.id); // §13.5 «появляется сверху списка раскрытой»
      notification.notify(CREATE_SUCCESS_MESSAGE, NOTIFICATION_SEVERITY.SUCCESS);
    },
    [expanded, notification],
  );

  const handleCreateFailed = useCallback(
    (error: Error) => {
      notification.notifyError(extractApiErrorMessage(error, CREATE_ERROR_FALLBACK_MESSAGE));
    },
    [notification],
  );

  const handleDeleted = useCallback(() => {
    setDeleteTargetId(null);
    notification.notify(DELETE_SUCCESS_MESSAGE, NOTIFICATION_SEVERITY.SUCCESS);
  }, [notification]);

  const handleDeleteFailed = useCallback(
    (error: Error) => {
      notification.notifyError(extractApiErrorMessage(error, DELETE_ERROR_FALLBACK_MESSAGE));
    },
    [notification],
  );

  const handlePreviewFailed = useCallback(
    (error: Error) => {
      // 404 — штатный исход §4.3/§5.3 (ссылка распознана, но вакансия не найдена),
      // а не сбой похода в hh.ru.
      const severity =
        extractApiErrorStatus(error) === HTTP_STATUS_NOT_FOUND
          ? NOTIFICATION_SEVERITY.INFO
          : NOTIFICATION_SEVERITY.WARNING;

      notification.notify(extractApiErrorMessage(error, PREVIEW_ERROR_FALLBACK_MESSAGE), severity);
    },
    [notification],
  );

  // §7.6: только подпись исхода, без message — подробности (lastSyncError) уже осели
  // в tooltip иконки «Синхр.», кэш патчится до вызова onSynced.
  const handleSynced = useCallback(
    (result: SyncResult) => {
      notification.notify(
        SYNC_OUTCOME_LABELS[result.outcome],
        SYNC_OUTCOME_NOTIFICATION_SEVERITY[result.outcome],
      );
    },
    [notification],
  );

  const handleSyncFailed = useCallback(
    (error: Error) => {
      notification.notifyError(extractApiErrorMessage(error, SYNC_ERROR_FALLBACK_MESSAGE));
    },
    [notification],
  );

  const handleSyncAllFinished = useCallback((summary: SyncSummary) => {
    setSyncSummary(summary);
  }, []);

  const handleSyncAllFailed = useCallback(
    (error: Error) => {
      notification.notifyError(extractApiErrorMessage(error, SYNC_ALL_ERROR_FALLBACK_MESSAGE));
    },
    [notification],
  );

  const handleSyncSummaryDismiss = useCallback(() => {
    setSyncSummary(null);
  }, []);

  const create = useCreateApplication({ onCreated: handleCreated, onFailed: handleCreateFailed });
  const remove = useDeleteApplication({ onDeleted: handleDeleted, onFailed: handleDeleteFailed });
  const rowSync = useSyncApplication({ onSynced: handleSynced, onFailed: handleSyncFailed });
  const syncAll = useSyncAllOpen({
    onFinished: handleSyncAllFinished,
    onFailed: handleSyncAllFailed,
  });

  const handleCreateSubmit = (payload: ApplicationCreate) => {
    create.mutate(payload);
  };

  const handleSyncAllOpen = () => {
    setSyncSummary(null); // сводка предыдущего прогона не должна висеть поверх нового

    syncAll.mutate();
  };

  const handleDeleteConfirm = (id: string) => {
    remove.mutate(id);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppHeader
        openCount={counts.data?.open ?? 0}
        totalCount={counts.data?.total ?? 0}
        // Именно «чисел нет», а не «идёт загрузка»: при ошибке запроса isPending уже false,
        // а data всё ещё undefined — и счётчик показал бы достоверно выглядящее «0 / 0».
        isCountsUnknown={counts.data === undefined}
        isSyncingAll={syncAll.isPending}
        onSyncAllOpen={handleSyncAllOpen}
      />

      <Container maxWidth={false} sx={{ px: CONTAINER_PADDING_X, py: CONTAINER_PADDING_Y }}>
        <Stack spacing={FIELD_GAP}>
          <FilterBar
            filters={filters}
            onFiltersChange={setFilters}
            isAllExpanded={isAllExpanded}
            onToggleExpandAll={handleToggleExpandAll}
            onAdd={handleAdd}
          />

          {syncSummary !== null ? (
            <SyncSummaryAlert summary={syncSummary} onDismiss={handleSyncSummaryDismiss} />
          ) : null}

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
            onAdd={handleAdd}
            syncingIds={rowSync.syncingIds}
            onSync={rowSync.sync}
            onDelete={handleDeleteRequest}
          />
        </Stack>
      </Container>

      <NotificationSnackbar
        notification={notification.notification}
        onClose={notification.dismiss}
      />

      {/* Условный монтаж — архитектурное решение (§9), а не оптимизация: свежий монтаж
          сам по себе даёт чистую форму без единого useEffect. */}
      {isCreateOpen ? (
        <CreateApplicationDialog
          isSubmitting={create.isPending}
          onSubmit={handleCreateSubmit}
          onCancel={handleCreateCancel}
          onPreviewFailed={handlePreviewFailed}
        />
      ) : null}

      {deleteTarget !== null ? (
        <ConfirmDeleteDialog
          application={deleteTarget}
          isDeleting={remove.isPending}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      ) : null}
    </Box>
  );
}
