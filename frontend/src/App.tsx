import { Box, Tab, Tabs } from '@mui/material';
import { useCallback, useState } from 'react';
import type { SyntheticEvent } from 'react';

import { AppHeader } from './components/AppHeader/AppHeader';
import { ApplicationsScreen } from './components/ApplicationsScreen/ApplicationsScreen';
import { NotificationSnackbar } from './components/NotificationSnackbar/NotificationSnackbar';
import { VacanciesScreen } from './components/VacanciesScreen/VacanciesScreen';
import { APP_TAB, APP_TAB_LABELS, APP_TABS_ARIA_LABEL, DEFAULT_APP_TAB } from './constants/app.constants';
import { SYNC_ALL_ERROR_FALLBACK_MESSAGE } from './constants/sync.constants';
import { useApplicationsCounts } from './hooks/useApplications';
import { useNotification } from './hooks/useNotification';
import { useSyncAllOpen } from './hooks/useSyncAllOpen';
import type { AppTab } from './types/app.type';
import type { SyncSummary } from './types/sync.interfaces';
import { extractApiErrorMessage } from './utils/error.utils';

/**
 * Шелл приложения (§7.9): AppHeader и Tabs живут здесь и не размонтируются при
 * переключении вкладок — счётчик «Открытых: N / M» и массовый прогон (§7.7) относятся
 * к откликам, но кнопка их запуска в AppHeader показана независимо от активной вкладки
 * (мокап §7.9), поэтому их состояние тоже здесь, а не в ApplicationsScreen. Сама Alert-
 * сводка прогона остаётся в потоке экрана откликов — передаётся туда пропом.
 *
 * Активная вкладка — обычный useState, роутера в проекте нет и не заводится (§7.9).
 * Неактивная вкладка размонтируется: серверные данные переживают это в React Query,
 * а несохранённые правки полей откликов уходят на blur ещё до исчезновения экрана (§7.3).
 */
export function App() {
  const [tab, setTab] = useState<AppTab>(DEFAULT_APP_TAB);
  const counts = useApplicationsCounts();
  const notification = useNotification();
  const [syncSummary, setSyncSummary] = useState<SyncSummary | null>(null);

  const handleSyncAllFinished = useCallback((summary: SyncSummary) => {
    setSyncSummary(summary);
  }, []);

  const handleSyncAllFailed = useCallback(
    (error: Error) => {
      notification.notifyError(extractApiErrorMessage(error, SYNC_ALL_ERROR_FALLBACK_MESSAGE));
    },
    [notification],
  );

  const syncAll = useSyncAllOpen({
    onFinished: handleSyncAllFinished,
    onFailed: handleSyncAllFailed,
  });

  const handleSyncAllOpen = () => {
    setSyncSummary(null); // сводка предыдущего прогона не должна висеть поверх нового

    syncAll.mutate();
  };

  const handleSyncSummaryDismiss = useCallback(() => {
    setSyncSummary(null);
  }, []);

  const handleTabChange = (_event: SyntheticEvent, value: AppTab) => {
    setTab(value);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppHeader
        openCount={counts.data?.open ?? 0}
        totalCount={counts.data?.total ?? 0}
        // Именно «чисел нет», а не «идёт загрузка»: при ошибке запроса isPending уже false,
        // а data всё ещё undefined — и счётчик показал бы достоверно выглядящее «0 / 0».
        isCountsUnknown={counts.data === undefined}
        isSyncingAll={syncAll.isPending}
        onSyncAllOpen={handleSyncAllOpen}
      />

      <Tabs value={tab} onChange={handleTabChange} aria-label={APP_TABS_ARIA_LABEL}>
        <Tab value={APP_TAB.APPLICATIONS} label={APP_TAB_LABELS[APP_TAB.APPLICATIONS]} />
        <Tab value={APP_TAB.VACANCIES} label={APP_TAB_LABELS[APP_TAB.VACANCIES]} />
      </Tabs>

      {tab === APP_TAB.APPLICATIONS ? (
        <ApplicationsScreen
          syncSummary={syncSummary}
          onSyncSummaryDismiss={handleSyncSummaryDismiss}
          notification={notification}
        />
      ) : (
        <VacanciesScreen notification={notification} />
      )}

      <NotificationSnackbar
        notification={notification.notification}
        onClose={notification.dismiss}
      />
    </Box>
  );
}
