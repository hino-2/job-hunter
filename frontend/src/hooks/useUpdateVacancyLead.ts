import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { updateVacancyLead } from '../api/vacancy-search.api';
import { VACANCY_LEADS_QUERY_KEY } from '../constants/query.constants';
import type { VacancyLead } from '../types/vacancy-search.interfaces';
import {
  insertVacancyLeadIntoCaches,
  readVacancyLeadFromCaches,
  removeVacancyLeadFromCaches,
} from '../utils/vacancy-leads-cache.utils';
import type {
  UpdateVacancyLeadOptions,
  UpdateVacancyLeadVariables,
} from './use-update-vacancy-lead.interfaces';

/**
 * Скрытие/возврат лида (§7.9.3): PATCH /api/vacancy-leads/:id, оптимистичное убирание
 * записи из текущей выборки сразу по клику, без ожидания ответа.
 *
 * Откат при ошибке — тот же приём, что и в §7.3 (useUpdateApplication): снимок
 * снимается в onMutate и синхронно возвращается в onError, без похода в сеть. Инвалидация
 * кэшем не годится для отката — неудача PATCH чаще всего сетевая, и восстанавливающий
 * рефетч (retry: 1) не пройдёт тоже, а запись так и останется пропавшей из списка.
 * Инвалидация остаётся только в onSuccess: там она нужна, чтобы актуализировать
 * противоположную выборку (там, куда запись попала), а не одну открытую сейчас —
 * членство записи в чужой отфильтрованной выборке клиенту неизвестно.
 */
export function useUpdateVacancyLead(
  options: UpdateVacancyLeadOptions,
): UseMutationResult<void, Error, UpdateVacancyLeadVariables, VacancyLead | undefined> {
  const { onToggled, onFailed } = options;
  const client = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, hidden }: UpdateVacancyLeadVariables) => {
      await updateVacancyLead(id, { hidden });
    },
    onMutate: async ({ id }) => {
      // Без отмены GET, стартовавший до клика, вернётся и заново подставит запись.
      await client.cancelQueries({ queryKey: VACANCY_LEADS_QUERY_KEY });

      const previous = readVacancyLeadFromCaches(client, id);

      removeVacancyLeadFromCaches(client, id);

      return previous;
    },
    onError: (error, variables, previous) => {
      if (previous !== undefined) {
        insertVacancyLeadIntoCaches(client, previous);
      }

      onFailed(error, variables);
    },
    onSuccess: (_data, variables) => {
      void client.invalidateQueries({ queryKey: VACANCY_LEADS_QUERY_KEY });
      onToggled(variables);
    },
  });
}
