import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { startVacancyScan } from '../api/vacancy-search.api';
import { HTTP_STATUS_CONFLICT } from '../constants/api.constants';
import { VACANCY_SCAN_STATUS_QUERY_KEY } from '../constants/query.constants';
import { SCAN_ALREADY_RUNNING_MESSAGE } from '../constants/vacancy-search.constants';
import type { ScanAcceptedResponse } from '../types/vacancy-search.interfaces';
import type { ScanMode } from '../types/vacancy-search.type';
import { extractApiErrorMessage, extractApiErrorStatus } from '../utils/error.utils';
import type { StartVacancyScanOptions } from './use-start-vacancy-scan.interfaces';

/**
 * Запуск прогона поиска (§7.9.2, §4.11.12): POST /api/vacancy-leads/scan { mode }, 202
 * сразу, не дожидаясь конца. И на успехе, и на 409 инвалидируем статус прогона — в обоих
 * случаях где-то (только что либо уже) идёт RUNNING, и useVacancyScanStatus обязан
 * подхватить его сразу, а не только на следующем плановом опросе. 409 теперь покрывает
 * два разных исхода («Начать»/«Продолжить» при уже идущем прогоне и «Продолжить» без
 * валидной позиции, §5.7) — текст различает их, поэтому наверх идёт сообщение сервера.
 */
export function useStartVacancyScan(
  options: StartVacancyScanOptions,
): UseMutationResult<ScanAcceptedResponse, Error, ScanMode> {
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
        onAlreadyRunning(extractApiErrorMessage(error, SCAN_ALREADY_RUNNING_MESSAGE));

        return;
      }

      onFailed(error);
    },
  });
}
