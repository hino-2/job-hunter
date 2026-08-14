import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { startVacancyScan } from '../api/vacancy-search.api';
import { HTTP_STATUS_CONFLICT } from '../constants/api.constants';
import { VACANCY_SCAN_STATUS_QUERY_KEY } from '../constants/query.constants';
import type { ScanAcceptedResponse } from '../types/vacancy-search.interfaces';
import { extractApiErrorStatus } from '../utils/error.utils';
import type { StartVacancyScanOptions } from './use-start-vacancy-scan.interfaces';

/**
 * Запуск прогона поиска (§7.9.2): POST /api/vacancy-leads/scan, 202 сразу, не дожидаясь
 * конца. И на успехе, и на 409 инвалидируем статус прогона — в обоих случаях где-то
 * (только что либо уже) идёт RUNNING, и useVacancyScanStatus обязан подхватить его
 * сразу, а не только на следующем плановом опросе.
 */
export function useStartVacancyScan(
  options: StartVacancyScanOptions,
): UseMutationResult<ScanAcceptedResponse, Error, void> {
  const { onAlreadyRunning, onFailed } = options;
  const client = useQueryClient();

  return useMutation({
    mutationFn: startVacancyScan,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: VACANCY_SCAN_STATUS_QUERY_KEY });
    },
    onError: (error) => {
      if (extractApiErrorStatus(error) === HTTP_STATUS_CONFLICT) {
        void client.invalidateQueries({ queryKey: VACANCY_SCAN_STATUS_QUERY_KEY });
        onAlreadyRunning();

        return;
      }

      onFailed(error);
    },
  });
}
