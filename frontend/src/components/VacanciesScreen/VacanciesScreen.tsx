import { Container, Stack } from '@mui/material';
import { useCallback, useMemo, useState } from 'react';

import {
  CONTAINER_PADDING_X,
  CONTAINER_PADDING_Y,
  FIELD_GAP,
} from '../../constants/layout.constants';
import { NOTIFICATION_SEVERITY } from '../../constants/notification.constants';
import { SEARCH_DEBOUNCE_MS } from '../../constants/query.constants';
import {
  APPLY_VACANCY_ERROR_FALLBACK_MESSAGE,
  APPLY_VACANCY_SUCCESS_MESSAGE,
  DEFAULT_VACANCY_LEADS_FILTERS,
  EMPTY_SCAN_RESUME_STATE,
  EMPTY_VACANCY_LEADS,
  HIDE_VACANCY_ERROR_FALLBACK_MESSAGE,
  RESTORE_VACANCY_ERROR_FALLBACK_MESSAGE,
  SCAN_MODE,
  SCAN_START_ERROR_FALLBACK_MESSAGE,
  SCAN_STATUS,
  SCAN_STOP_ERROR_FALLBACK_MESSAGE,
  SETTINGS_SAVE_ERROR_FALLBACK_MESSAGE,
  SETTINGS_SAVE_SUCCESS_MESSAGE,
} from '../../constants/vacancy-search.constants';
import { useApplyVacancyLead } from '../../hooks/useApplyVacancyLead';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useExpandedIds } from '../../hooks/useExpandedIds';
import { useStartVacancyScan } from '../../hooks/useStartVacancyScan';
import { useStopVacancyScan } from '../../hooks/useStopVacancyScan';
import { useUpdateVacancyLead } from '../../hooks/useUpdateVacancyLead';
import { useVacancyLeads } from '../../hooks/useVacancyLeads';
import { useVacancyScanStatus } from '../../hooks/useVacancyScanStatus';
import type { UpdateVacancyLeadVariables } from '../../hooks/use-update-vacancy-lead.interfaces';
import type { VacancyLeadsFilters } from '../../types/vacancy-search.interfaces';
import { extractApiErrorMessage } from '../../utils/error.utils';
import { isVacancyLeadsSearchActive } from '../../utils/vacancy-lead.utils';
import { ScanStatusAlert } from '../ScanStatusAlert/ScanStatusAlert';
import { SearchSettingsDialog } from '../SearchSettingsDialog/SearchSettingsDialog';
import { VacancyLeadsFilterBar } from '../VacancyLeadsFilterBar/VacancyLeadsFilterBar';
import { VacancyLeadsList } from '../VacancyLeadsList/VacancyLeadsList';
import type { VacanciesScreenProps } from './vacancies-screen.interfaces';

/**
 * Экран «Вакансии» (§7.9, §14 п.22). notification приходит пропом из App.tsx — Snackbar
 * один на всё приложение (§7.3), у экрана своего нет. AppHeader и вкладки остаются
 * смонтированными в App.tsx (§7.9), этот экран отвечает только за содержимое вкладки.
 */
export function VacanciesScreen({ notification }: VacanciesScreenProps) {
  const [filters, setFilters] = useState<VacancyLeadsFilters>(DEFAULT_VACANCY_LEADS_FILTERS);
  const debouncedSearch = useDebouncedValue(filters.search, SEARCH_DEBOUNCE_MS);
  // Как и в ApplicationsScreen: опустошение строки поиска применяется мгновенно,
  // чтобы «Сбросить фильтры» не показывал секунду устаревший результат.
  const effectiveSearch = filters.search.trim().length === 0 ? filters.search : debouncedSearch;
  const effectiveFilters = useMemo<VacancyLeadsFilters>(
    () => ({ ...filters, search: effectiveSearch }),
    [filters, effectiveSearch],
  );

  const leads = useVacancyLeads(effectiveFilters);
  const expanded = useExpandedIds();
  const scanStatus = useVacancyScanStatus();
  const [isSettingsOpen, setSettingsOpen] = useState(false);

  const items = leads.data ?? EMPTY_VACANCY_LEADS;

  const handleRetry = () => {
    void leads.refetch();
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_VACANCY_LEADS_FILTERS);
  };

  const handleOpenSettings = useCallback(() => {
    setSettingsOpen(true);
  }, []);

  const handleCloseSettings = useCallback(() => {
    setSettingsOpen(false);
  }, []);

  const handleSettingsSaved = useCallback(() => {
    setSettingsOpen(false);
    notification.notify(SETTINGS_SAVE_SUCCESS_MESSAGE, NOTIFICATION_SEVERITY.SUCCESS);
  }, [notification]);

  const handleSettingsSaveFailed = useCallback(
    (error: Error) => {
      notification.notifyError(extractApiErrorMessage(error, SETTINGS_SAVE_ERROR_FALLBACK_MESSAGE));
    },
    [notification],
  );

  const handleScanAlreadyRunning = useCallback(
    (message: string) => {
      notification.notify(message, NOTIFICATION_SEVERITY.INFO);
    },
    [notification],
  );

  const handleScanFailed = useCallback(
    (error: Error) => {
      notification.notifyError(extractApiErrorMessage(error, SCAN_START_ERROR_FALLBACK_MESSAGE));
    },
    [notification],
  );

  const handleStopNotRunning = useCallback(
    (message: string) => {
      notification.notify(message, NOTIFICATION_SEVERITY.INFO);
    },
    [notification],
  );

  const handleStopFailed = useCallback(
    (error: Error) => {
      notification.notifyError(extractApiErrorMessage(error, SCAN_STOP_ERROR_FALLBACK_MESSAGE));
    },
    [notification],
  );

  const handleToggleFailed = useCallback(
    (error: Error, variables: UpdateVacancyLeadVariables) => {
      const fallback = variables.hidden
        ? HIDE_VACANCY_ERROR_FALLBACK_MESSAGE
        : RESTORE_VACANCY_ERROR_FALLBACK_MESSAGE;

      notification.notifyError(extractApiErrorMessage(error, fallback));
    },
    [notification],
  );

  const handleApplied = useCallback(() => {
    notification.notify(APPLY_VACANCY_SUCCESS_MESSAGE, NOTIFICATION_SEVERITY.SUCCESS);
  }, [notification]);

  const handleAlreadyApplied = useCallback(
    (message: string) => {
      notification.notify(message, NOTIFICATION_SEVERITY.INFO);
    },
    [notification],
  );

  const handleApplyFailed = useCallback(
    (error: Error) => {
      notification.notifyError(extractApiErrorMessage(error, APPLY_VACANCY_ERROR_FALLBACK_MESSAGE));
    },
    [notification],
  );

  const startScan = useStartVacancyScan({
    onAlreadyRunning: handleScanAlreadyRunning,
    onFailed: handleScanFailed,
  });
  const stopScan = useStopVacancyScan({
    onNotRunning: handleStopNotRunning,
    onFailed: handleStopFailed,
  });
  // Деструктурируем mutate, а не держим весь объект мутации в deps: useMutation (React
  // Query v5) возвращает новый объект на каждый рендер, а mutate стабилен на всё время
  // жизни компонента (тот же приём, что useSyncApplication). Иначе колбэк пробивал бы
  // memo каждого VacancyLeadAccordion на каждый тик поллинга статуса прогона.
  const { mutate: toggleHidden } = useUpdateVacancyLead({
    onToggled: () => {},
    onFailed: handleToggleFailed,
  });
  const { applyingIds, apply } = useApplyVacancyLead({
    onApplied: handleApplied,
    onAlreadyApplied: handleAlreadyApplied,
    onFailed: handleApplyFailed,
  });

  const handleScanFresh = () => {
    startScan.mutate(SCAN_MODE.FRESH);
  };

  const handleScanResume = () => {
    startScan.mutate(SCAN_MODE.RESUME);
  };

  const handleScanStop = () => {
    stopScan.mutate();
  };

  // useCallback обязателен: колбэк уходит пропом в каждый memo-аккордеон списка (§9).
  const handleToggleHidden = useCallback(
    (id: string, hidden: boolean) => {
      toggleHidden({ id, hidden });
    },
    [toggleHidden],
  );

  const isScanRunning = scanStatus.data?.status === SCAN_STATUS.RUNNING;
  const isStopRequested = scanStatus.data?.stopRequested === true;
  const resume = scanStatus.data?.resume ?? EMPTY_SCAN_RESUME_STATE;
  const showScanAlert =
    scanStatus.data !== undefined && scanStatus.data.status !== SCAN_STATUS.IDLE;

  return (
    <>
      <Container maxWidth={false} sx={{ px: CONTAINER_PADDING_X, py: CONTAINER_PADDING_Y }}>
        <Stack spacing={FIELD_GAP}>
          <VacancyLeadsFilterBar
            filters={filters}
            onFiltersChange={setFilters}
            onScanFresh={handleScanFresh}
            onScanResume={handleScanResume}
            onScanStop={handleScanStop}
            isScanRunning={isScanRunning}
            isStopRequested={isStopRequested}
            isStartPending={startScan.isPending}
            isStopPending={stopScan.isPending}
            resume={resume}
            onOpenSettings={handleOpenSettings}
          />

          {showScanAlert && scanStatus.data !== undefined ? (
            <ScanStatusAlert status={scanStatus.data} />
          ) : null}

          <VacancyLeadsList
            leads={items}
            isPending={leads.isPending}
            isError={leads.isError}
            isSearchActive={isVacancyLeadsSearchActive(effectiveFilters)}
            isHiddenView={filters.showHiddenOnly}
            onRetry={handleRetry}
            onResetFilters={handleResetFilters}
            expandedIds={expanded.expandedIds}
            onToggle={expanded.actions.toggle}
            onToggleHidden={handleToggleHidden}
            applyingIds={applyingIds}
            onApply={apply}
          />
        </Stack>
      </Container>

      {/* Условный монтаж (§9): свежий монтаж сам даёт чистое состояние формы. */}
      {isSettingsOpen ? (
        <SearchSettingsDialog
          onClose={handleCloseSettings}
          onSaved={handleSettingsSaved}
          onSaveFailed={handleSettingsSaveFailed}
        />
      ) : null}
    </>
  );
}
