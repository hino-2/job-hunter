import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

import { syncApplication } from '../api/applications.api';
import { HTTP_STATUS_NOT_FOUND } from '../constants/api.constants';
import { APPLICATIONS_QUERY_KEY } from '../constants/query.constants';
import type { SyncResult } from '../types/sync.interfaces';
import { buildSyncEchoPatch } from '../utils/application.utils';
import {
  patchApplicationInCaches,
  readApplicationFromCaches,
  removeApplicationFromCaches,
} from '../utils/applications-cache.utils';
import { extractApiErrorStatus } from '../utils/error.utils';
import type {
  SyncApplicationController,
  SyncApplicationOptions,
} from './use-sync-application.interfaces';

/**
 * Точечная синхронизация одной записи (§7.6): POST /api/applications/:id/sync, патч только
 * sync-колонок в кэш, набор синхронизирующихся id — для спиннера строки.
 *
 * Набор id держится в самом хуке, а не в App или компоненте: isPending/variables
 * у useMutation описывают только последний mutate(), а кликнуть 🔄 можно на нескольких
 * строках подряд — гарантировать парность «добавили в onMutate — убрали в onSettled»
 * можно только здесь, функциональным setState.
 */
export function useSyncApplication(options: SyncApplicationOptions): SyncApplicationController {
  const { onSynced, onFailed } = options;
  const client = useQueryClient();
  const [syncingIds, setSyncingIds] = useState<ReadonlySet<string>>(new Set());

  const { mutate } = useMutation({
    mutationFn: syncApplication,
    onMutate: (id) => {
      setSyncingIds((previous) => new Set(previous).add(id));
    },
    onSettled: (_result, _error, id) => {
      setSyncingIds((previous) => {
        if (!previous.has(id)) {
          return previous;
        }

        const next = new Set(previous);

        next.delete(id);

        return next;
      });
    },
    onSuccess: (result: SyncResult, id) => {
      const cached = readApplicationFromCaches(client, id);

      patchApplicationInCaches(client, id, buildSyncEchoPatch(result, cached));

      // Инвалидируем только на смену статуса — она меняет состав отфильтрованного списка
      // и счётчик «Открытых: N / M» (§7.8), то же правило, что у useUpdateApplication.
      if (cached === undefined || cached.status !== result.application.status) {
        void client.invalidateQueries({ queryKey: APPLICATIONS_QUERY_KEY });
      }

      onSynced(result);
    },
    onError: (error, id) => {
      // Запись удалили в другой вкладке — фантомный аккордеон обязан исчезнуть.
      if (extractApiErrorStatus(error) === HTTP_STATUS_NOT_FOUND) {
        removeApplicationFromCaches(client, id);
        void client.invalidateQueries({ queryKey: APPLICATIONS_QUERY_KEY });
      }

      onFailed(error);
    },
  });

  const sync = useCallback(
    (id: string) => {
      mutate(id);
    },
    [mutate],
  );

  return useMemo(() => ({ syncingIds, sync }), [syncingIds, sync]);
}
