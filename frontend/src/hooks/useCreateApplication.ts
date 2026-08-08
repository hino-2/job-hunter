import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { createApplication } from '../api/applications.api';
import { APPLICATIONS_QUERY_KEY } from '../constants/query.constants';
import type { Application, ApplicationCreate } from '../types/application.interfaces';
import type { CreateApplicationOptions } from './use-create-application.interfaces';

/**
 * Создание записи (§7.4). Без оптимистичной вставки в кэш: позиция новой записи в чужих
 * комбинациях фильтров/сортировок клиенту неизвестна, поэтому список просто инвалидируется
 * целиком — префиксный ключ накрывает и счётчик шапки (§7.8).
 */
export function useCreateApplication(
  options: CreateApplicationOptions,
): UseMutationResult<Application, Error, ApplicationCreate> {
  const { onCreated, onFailed } = options;
  const client = useQueryClient();

  return useMutation({
    mutationFn: createApplication,
    onSuccess: (created) => {
      void client.invalidateQueries({ queryKey: APPLICATIONS_QUERY_KEY });
      onCreated(created);
    },
    onError: (error) => {
      onFailed(error);
    },
  });
}
