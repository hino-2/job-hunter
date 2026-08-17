import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { fetchScanStatus } from '../api/vacancy-search.api';
import {
  SCAN_STATUS_POLL_INTERVAL_MS,
  VACANCY_LEADS_QUERY_KEY,
  VACANCY_SCAN_STATUS_QUERY_KEY,
} from '../constants/query.constants';
import { SCAN_STATUS } from '../constants/vacancy-search.constants';
import type { ScanStatusResponse } from '../types/vacancy-search.interfaces';

/**
 * Статус прогона поиска (§7.9.2). Опрашивается на монтировании и затем раз
 * в SCAN_STATUS_POLL_INTERVAL_MS, пока status === RUNNING; refetchInterval сам
 * останавливается, как только статус выходит из RUNNING.
 *
 * Переход RUNNING → DONE/ERROR инвалидирует список лидов целиком: клиенту заранее
 * неизвестно, куда новые записи попадут в текущей сортировке и проходят ли они под
 * активный поисковый фильтр (§7.9.2), то же обоснование, что у useSyncAllOpen. Ref,
 * а не состояние: инвалидация — сайд-эффект, а не значение для рендера этого хука.
 */
export function useVacancyScanStatus(): UseQueryResult<ScanStatusResponse> {
  const client = useQueryClient();
  const previousStatusRef = useRef<ScanStatusResponse['status'] | null>(null);

  const query = useQuery({
    queryKey: VACANCY_SCAN_STATUS_QUERY_KEY,
    queryFn: fetchScanStatus,
    refetchInterval: (currentQuery) =>
      currentQuery.state.data?.status === SCAN_STATUS.RUNNING
        ? SCAN_STATUS_POLL_INTERVAL_MS
        : false,
  });

  const status = query.data?.status;

  useEffect(() => {
    if (status === undefined) {
      return;
    }

    const previous = previousStatusRef.current;

    previousStatusRef.current = status;

    if (previous === SCAN_STATUS.RUNNING && status !== SCAN_STATUS.RUNNING) {
      void client.invalidateQueries({ queryKey: VACANCY_LEADS_QUERY_KEY });
    }
  }, [status, client]);

  return query;
}
