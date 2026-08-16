import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { stopVacancyScan } from '../api/vacancy-search.api';
import { HTTP_STATUS_CONFLICT } from '../constants/api.constants';
import { VACANCY_SCAN_STATUS_QUERY_KEY } from '../constants/query.constants';
import { SCAN_STOP_NOT_RUNNING_MESSAGE } from '../constants/vacancy-search.constants';
import type { ScanStopAcceptedResponse } from '../types/vacancy-search.interfaces';
import { extractApiErrorMessage, extractApiErrorStatus } from '../utils/error.utils';
import type { StopVacancyScanOptions } from './use-stop-vacancy-scan.interfaces';

/**
 * Остановка прогона поиска (§7.9.2, §4.11.12): POST /api/vacancy-leads/scan/stop, 202
 * сразу — кооперативная отмена завершится позже (§4.11.12). И на успехе, и на 409
 * инвалидируем статус прогона той же логикой, что useStartVacancyScan: пока прогон
 * не увидит флаг stopRequested сам, useVacancyScanStatus обязан подхватить хотя бы
 * то, что запрос дошёл, сразу, а не только на следующем плановом опросе.
 */
export function useStopVacancyScan(
  options: StopVacancyScanOptions,
): UseMutationResult<ScanStopAcceptedResponse, Error, void> {
  const { onNotRunning, onFailed } = options;
  const client = useQueryClient();

  return useMutation({
    mutationFn: stopVacancyScan,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: VACANCY_SCAN_STATUS_QUERY_KEY });
    },
    onError: (error) => {
      if (extractApiErrorStatus(error) === HTTP_STATUS_CONFLICT) {
        void client.invalidateQueries({ queryKey: VACANCY_SCAN_STATUS_QUERY_KEY });
        onNotRunning(extractApiErrorMessage(error, SCAN_STOP_NOT_RUNNING_MESSAGE));

        return;
      }

      onFailed(error);
    },
  });
}
