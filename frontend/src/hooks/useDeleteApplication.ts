import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { deleteApplication } from '../api/applications.api';
import { APPLICATIONS_QUERY_KEY } from '../constants/query.constants';
import { removeApplicationFromCaches } from '../utils/applications-cache.utils';
import type { DeleteApplicationOptions } from './use-delete-application.interfaces';

/**
 * Удаление записи (§7.5). Вычистка из кэшей в onSuccess, без оптимистичного удаления
 * с откатом: DELETE — операция без промежуточных состояний, откатывать нечего.
 */
export function useDeleteApplication(
  options: DeleteApplicationOptions,
): UseMutationResult<void, Error, string> {
  const { onDeleted, onFailed } = options;
  const client = useQueryClient();

  return useMutation({
    mutationFn: deleteApplication,
    onSuccess: (_result, id) => {
      removeApplicationFromCaches(client, id);
      void client.invalidateQueries({ queryKey: APPLICATIONS_QUERY_KEY });
      onDeleted(id);
    },
    onError: (error) => {
      onFailed(error);
    },
  });
}
