import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { syncOpenApplications } from '../api/applications.api';
import { APPLICATIONS_QUERY_KEY } from '../constants/query.constants';
import type { SyncSummary } from '../types/sync.interfaces';
import type { SyncAllOpenOptions } from './use-sync-all-open.interfaces';

/**
 * Массовый прогон открытых записей (§7.7): POST /api/applications/sync-open. applications[]
 * из ответа в кэш не вливается — членство записи в отфильтрованных списках клиенту заранее
 * неизвестно (то же обоснование, что у useCreateApplication), список просто инвалидируется
 * целиком, префиксный ключ накрывает и счётчик шапки (§7.8).
 */
export function useSyncAllOpen(
  options: SyncAllOpenOptions,
): UseMutationResult<SyncSummary, Error, void> {
  const { onFinished, onFailed } = options;
  const client = useQueryClient();

  return useMutation({
    mutationFn: syncOpenApplications,
    onSuccess: (summary) => {
      void client.invalidateQueries({ queryKey: APPLICATIONS_QUERY_KEY });
      onFinished(summary);
    },
    onError: (error) => {
      // Прогон синхронный и мог отработать (или частично применить исходы) в БД, а до
      // клиента ответ не доехал по таймауту/504 — оставить список в старом виде было бы
      // прямым обманом.
      void client.invalidateQueries({ queryKey: APPLICATIONS_QUERY_KEY });
      onFailed(error);
    },
  });
}
