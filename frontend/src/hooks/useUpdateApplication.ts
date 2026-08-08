import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { updateApplication } from '../api/applications.api';
import { APPLICATIONS_QUERY_KEY } from '../constants/query.constants';
import type { Application, ApplicationUpdate } from '../types/application.interfaces';
import { buildServerEchoPatch, pickApplicationPatch } from '../utils/application.utils';
import {
  patchApplicationInCaches,
  readApplicationFromCaches,
} from '../utils/applications-cache.utils';
import type {
  UpdateApplicationOptions,
  UpdateApplicationVariables,
} from './use-update-application.interfaces';

/**
 * Автосейв одного поля (§7.3): оптимистичный патч кэша, пополевой откат при ошибке.
 *
 * Контекст мутации — снимок ровно отправленных полей, а не всей записи. Откат снимком
 * вернул бы к устаревшему соседнее поле, сохранённое параллельно, пока этот запрос летел.
 *
 * Ни Snackbar, ни подсветку хук не рисует сам — он лишь зовёт onSaved/onFailed
 * вызывающего, уже приведя кэш в порядок.
 */
export function useUpdateApplication(
  options: UpdateApplicationOptions,
): UseMutationResult<Application, Error, UpdateApplicationVariables, ApplicationUpdate> {
  const { onSaved, onFailed } = options;
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({ id, patch }: UpdateApplicationVariables) => updateApplication(id, patch),
    onMutate: async ({ id, patch }): Promise<ApplicationUpdate> => {
      // Без отмены GET, стартовавший до правки, вернётся и затрёт оптимистичное значение.
      await client.cancelQueries({ queryKey: APPLICATIONS_QUERY_KEY });

      const cached = readApplicationFromCaches(client, id);
      const previous = cached === undefined ? {} : pickApplicationPatch(cached, patch);

      patchApplicationInCaches(client, id, patch);

      return previous;
    },
    onError: (error, { id }, previous) => {
      if (previous !== undefined) {
        patchApplicationInCaches(client, id, previous);
      }

      onFailed(error);
    },
    onSuccess: (saved, variables) => {
      const { id, patch } = variables;
      const cached = readApplicationFromCaches(client, id);

      patchApplicationInCaches(client, id, buildServerEchoPatch(saved, patch, cached));

      // Инвалидируем только на смену статуса: она меняет состав отфильтрованного списка
      // и счётчик «Открытых: N / M» (§7.8). После правки остальных полей перезагрузка
      // вредна — ответ заменил бы массив целиком и мигнул бы значением поля,
      // которое правят прямо сейчас.
      if (patch.status !== undefined) {
        void client.invalidateQueries({ queryKey: APPLICATIONS_QUERY_KEY });
      }

      onSaved(variables);
    },
  });
}
