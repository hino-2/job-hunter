import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

import { applyVacancyLead } from '../api/vacancy-search.api';
import { HTTP_STATUS_CONFLICT, HTTP_STATUS_NOT_FOUND } from '../constants/api.constants';
import { APPLICATIONS_QUERY_KEY, VACANCY_LEADS_QUERY_KEY } from '../constants/query.constants';
import { APPLY_VACANCY_ALREADY_MESSAGE } from '../constants/vacancy-search.constants';
import type { Application } from '../types/application.interfaces';
import { extractApiErrorMessage, extractApiErrorStatus } from '../utils/error.utils';
import {
  patchVacancyLeadInCaches,
  removeVacancyLeadFromCaches,
} from '../utils/vacancy-leads-cache.utils';
import type {
  ApplyVacancyLeadController,
  ApplyVacancyLeadOptions,
} from './use-apply-vacancy-lead.interfaces';

/**
 * Создание отклика из лида (§5.7, §7.9.1): POST /api/vacancy-leads/:id/apply, набор
 * применяющихся id — для подписи кнопки, тем же приёмом, что useSyncApplication.
 *
 * Набор id держится в самом хуке, а не в VacanciesScreen: isPending/variables
 * у useMutation описывают только последний mutate(), а нажать «Отклик» можно на
 * нескольких лидах подряд — гарантировать парность «добавили в onMutate — убрали
 * в onSettled» можно только здесь, функциональным setState.
 *
 * Известный размен: пока список лидов закэширован (staleTime 30 с), удаление отклика
 * в другой вкладке не снимет здесь hasApplication — само поправится на следующем рефетче.
 */
export function useApplyVacancyLead(options: ApplyVacancyLeadOptions): ApplyVacancyLeadController {
  const { onApplied, onAlreadyApplied, onFailed } = options;
  const client = useQueryClient();
  const [applyingIds, setApplyingIds] = useState<ReadonlySet<string>>(new Set());

  const { mutate } = useMutation({
    mutationFn: applyVacancyLead,
    onMutate: (id) => {
      setApplyingIds((previous) => new Set(previous).add(id));
    },
    onSettled: (_result, _error, id) => {
      setApplyingIds((previous) => {
        if (!previous.has(id)) {
          return previous;
        }

        const next = new Set(previous);

        next.delete(id);

        return next;
      });
    },
    onSuccess: (application: Application, id) => {
      patchVacancyLeadInCaches(client, id, { hasApplication: true });

      // Список откликов и счётчик «Открытых: N / M» (§7.8) — список лидов не
      // инвалидируем: изменённое поле уже пропатчено на месте, а рефетч 500 строк
      // перерисовал бы весь экран.
      void client.invalidateQueries({ queryKey: APPLICATIONS_QUERY_KEY });

      onApplied(application);
    },
    onError: (error, id) => {
      const status = extractApiErrorStatus(error);

      if (status === HTTP_STATUS_CONFLICT) {
        // Отклик по этой вакансии уже есть — штатный исход, а не сбой.
        patchVacancyLeadInCaches(client, id, { hasApplication: true });
        onAlreadyApplied(extractApiErrorMessage(error, APPLY_VACANCY_ALREADY_MESSAGE));

        return;
      }

      if (status === HTTP_STATUS_NOT_FOUND) {
        // Лид удалили в другой вкладке — фантомная строка обязана исчезнуть.
        removeVacancyLeadFromCaches(client, id);
        void client.invalidateQueries({ queryKey: VACANCY_LEADS_QUERY_KEY });
      }

      onFailed(error);
    },
  });

  const apply = useCallback(
    (id: string) => {
      mutate(id);
    },
    [mutate],
  );

  return useMemo(() => ({ applyingIds, apply }), [applyingIds, apply]);
}
