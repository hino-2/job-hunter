import { Container, Stack } from '@mui/material';
import { useCallback, useMemo, useState } from 'react';

import { ApplicationsList } from '../ApplicationsList/ApplicationsList';
import { ConfirmDeleteDialog } from '../ConfirmDeleteDialog/ConfirmDeleteDialog';
import { CreateApplicationDialog } from '../CreateApplicationDialog/CreateApplicationDialog';
import { FilterBar } from '../FilterBar/FilterBar';
import { SyncSummaryAlert } from '../SyncSummaryAlert/SyncSummaryAlert';
import {
  CREATE_ERROR_FALLBACK_MESSAGE,
  CREATE_SUCCESS_MESSAGE,
  DEFAULT_APPLICATION_FILTERS,
  DELETE_ERROR_FALLBACK_MESSAGE,
  DELETE_SUCCESS_MESSAGE,
  EMPTY_APPLICATIONS,
  PREVIEW_ERROR_FALLBACK_MESSAGE,
  SYNC_OUTCOME_LABELS,
} from '../../constants/application.constants';
import { HTTP_STATUS_NOT_FOUND } from '../../constants/api.constants';
import { CONTAINER_PADDING_X, CONTAINER_PADDING_Y, FIELD_GAP } from '../../constants/layout.constants';
import { NOTIFICATION_SEVERITY } from '../../constants/notification.constants';
import { SEARCH_DEBOUNCE_MS } from '../../constants/query.constants';
import {
  SYNC_ERROR_FALLBACK_MESSAGE,
  SYNC_OUTCOME_NOTIFICATION_SEVERITY,
} from '../../constants/sync.constants';
import { useApplications } from '../../hooks/useApplications';
import { useCreateApplication } from '../../hooks/useCreateApplication';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useDeleteApplication } from '../../hooks/useDeleteApplication';
import { useExpandedIds } from '../../hooks/useExpandedIds';
import { useInlineEdits } from '../../hooks/useInlineEdits';
import { useSyncApplication } from '../../hooks/useSyncApplication';
import type {
  Application,
  ApplicationCreate,
  ApplicationsFilters,
} from '../../types/application.interfaces';
import type { SyncResult } from '../../types/sync.interfaces';
import { isFilterActive } from '../../utils/application.utils';
import { areAllExpanded } from '../../utils/expanded-ids.utils';
import { extractApiErrorMessage, extractApiErrorStatus } from '../../utils/error.utils';
import type { ApplicationsScreenProps } from './applications-screen.interfaces';

/**
 * Экран «Отклики» (§7.1, §7.9). Дословный перенос бывшего App.tsx: здесь живёт всё
 * локальное состояние экрана — фильтры, раскрытость аккордеонов и несохранённые правки.
 * Серверные данные — только в React Query, глобального стора в проекте нет и не заводим
 * (§2.2). AppHeader, массовый прогон (§7.7) и Snackbar на всё приложение (§7.3) остались
 * в шелле (App.tsx): AppHeader не размонтируется при переключении вкладок (§7.9), а один
 * Snackbar на оба экрана не даёт двум уведомлениям лечь друг на друга, если оба смонтированы
 * разом. Сводка прогона и нотификатор приходят сюда пропами.
 */
export function ApplicationsScreen({
  syncSummary,
  onSyncSummaryDismiss,
  notification,
}: ApplicationsScreenProps) {
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
  const expanded = useExpandedIds();
  const edits = useInlineEdits({ onError: notification.notifyError });
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const items = applications.data ?? EMPTY_APPLICATIONS;
  const ids = useMemo(() => items.map((item) => item.id), [items]);
  const isAllExpanded = useMemo(
    () => areAllExpanded(expanded.expandedIds, ids),
    [expanded.expandedIds, ids],
  );
  const deleteTarget = useMemo(
    () => items.find((item) => item.id === deleteTargetId) ?? null,
    [items, deleteTargetId],
  );

  // §13.10.7: несохранённая правка сначала отправляется и только потом сворачивается.
  // Обе зависимости стабильны на всё время жизни экрана (edits.handlers и expanded.actions
  // не меняют идентичность), поэтому onToggle не пробивает memo аккордеонов; раскрытость
  // едет в список данными (expandedIds), а не колбэком.
  const handleToggle = useCallback(
    (id: string, isExpanded: boolean) => {
      if (!isExpanded) {
        edits.handlers.flush(id);
      }

      expanded.actions.toggle(id, isExpanded);
    },
    [edits.handlers, expanded.actions],
  );

  const handleToggleExpandAll = () => {
    if (isAllExpanded) {
      edits.handlers.flushAll();
      expanded.actions.collapseAll();
    } else {
      expanded.actions.expandAll(ids);
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
      expanded.actions.expand(created.id); // §13.5 «появляется сверху списка раскрытой»
      notification.notify(CREATE_SUCCESS_MESSAGE, NOTIFICATION_SEVERITY.SUCCESS);
    },
    [expanded.actions, notification],
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
      // а не сбой похода к источнику.
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

  const create = useCreateApplication({ onCreated: handleCreated, onFailed: handleCreateFailed });
  const remove = useDeleteApplication({ onDeleted: handleDeleted, onFailed: handleDeleteFailed });
  const rowSync = useSyncApplication({ onSynced: handleSynced, onFailed: handleSyncFailed });

  const handleCreateSubmit = (payload: ApplicationCreate) => {
    create.mutate(payload);
  };

  const handleDeleteConfirm = (id: string) => {
    remove.mutate(id);
  };

  return (
    <>
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
            <SyncSummaryAlert summary={syncSummary} onDismiss={onSyncSummaryDismiss} />
          ) : null}

          <ApplicationsList
            applications={items}
            isPending={applications.isPending}
            isError={applications.isError}
            isFilterActive={isFilterActive(effectiveFilters)}
            onRetry={handleRetry}
            onResetFilters={handleResetFilters}
            expandedIds={expanded.expandedIds}
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
    </>
  );
}
