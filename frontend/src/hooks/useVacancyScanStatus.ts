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
 * Список лидов инвалидируется целиком (никогда не мержится) в двух случаях: при каждом
 * увеличении progress.pagesFetched, пока status === RUNNING — так список пополняется
 * не реже раза на страницу, синхронно с резервной позицией (§4.11.9), — и на переходе
 * RUNNING → DONE/ERROR, для последней страницы. Клиенту заранее неизвестно, куда новые
 * записи попадут в текущей сортировке и проходят ли они под активный поисковый фильтр,
 * то же обоснование, что у useSyncAllOpen. Ref, а не состояние: инвалидация — сайд-эффект,
 * а не значение для рендера этого хука.
 *
 * База отсчёта pagesFetched сбрасывается не только при первом монтировании, но и при
 * старте нового прогона поверх уже смонтированного хука (§4.11.10 — «Начать»/«Продолжить»
 * можно жать многократно за сессию): backend обнуляет progress.pagesFetched на каждом
 * старте, а previousPagesFetchedRef без сброса ещё хранил бы счётчик прошлого прогона.
 */
export function useVacancyScanStatus(): UseQueryResult<ScanStatusResponse> {
  const client = useQueryClient();
  const previousStatusRef = useRef<ScanStatusResponse['status'] | null>(null);
  const previousPagesFetchedRef = useRef<number | null>(null);

  const query = useQuery({
    queryKey: VACANCY_SCAN_STATUS_QUERY_KEY,
    queryFn: fetchScanStatus,
    refetchInterval: (currentQuery) =>
      currentQuery.state.data?.status === SCAN_STATUS.RUNNING
        ? SCAN_STATUS_POLL_INTERVAL_MS
        : false,
  });

  const status = query.data?.status;
  const pagesFetched = query.data?.progress.pagesFetched;

  useEffect(() => {
    if (status === undefined || pagesFetched === undefined) {
      return;
    }

    const previousStatus = previousStatusRef.current;
    const previousPagesFetched = previousPagesFetchedRef.current;

    previousStatusRef.current = status;
    previousPagesFetchedRef.current = pagesFetched;

    const finishedRunning =
      previousStatus === SCAN_STATUS.RUNNING && status !== SCAN_STATUS.RUNNING;
    // Новый прогон начался, пока хук уже был смонтирован (предыдущий на этом же экране
    // успел завершиться) — previousPagesFetched ещё хранит счётчик прошлого прогона,
    // backend обнулил progress.pagesFetched при старте (tryStart), поэтому сравнение
    // со старым значением даст ложное «страница не обработана». База отсчёта сбрасывается
    // тем же приёмом, что и при первом монтировании (previousPagesFetched === null).
    const isRunStart =
      previousStatus !== null &&
      previousStatus !== SCAN_STATUS.RUNNING &&
      status === SCAN_STATUS.RUNNING;
    const baselinePagesFetched = isRunStart ? null : previousPagesFetched;
    const pageProcessedWhileRunning =
      status === SCAN_STATUS.RUNNING &&
      baselinePagesFetched !== null &&
      pagesFetched > baselinePagesFetched;

    if (finishedRunning || pageProcessedWhileRunning) {
      void client.invalidateQueries({ queryKey: VACANCY_LEADS_QUERY_KEY });
    }
  }, [status, pagesFetched, client]);

  return query;
}
