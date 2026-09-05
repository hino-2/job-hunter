import type { NotificationController } from '../../hooks/use-notification.interfaces';
import type { ApplicationsFilters } from '../../types/application.interfaces';
import type { SyncSummary } from '../../types/sync.interfaces';

/**
 * Пропы экрана откликов (§7.9). Сводка массового прогона приходит из шелла (App.tsx):
 * кнопка «Обновить все открытые» и счётчик живут в AppHeader, а AppHeader не
 * размонтируется при переключении вкладок, поэтому и мутация useSyncAllOpen — там же.
 * Сама Alert-сводка при этом остаётся в потоке экрана откликов (§7.1, §7.7).
 *
 * notification — тот же объект, что и в App.tsx (Snackbar один на всё приложение, §7.3):
 * идентичность объекта обязана быть постоянной, он уходит в useInlineEdits и дальше
 * в колбэки аккордеонов, а нестабильная ссылка пробила бы их memo.
 */
export interface ApplicationsScreenProps {
  /**
   * Фильтры, с которых начинает вкладка (§7.9, APP_TAB_FILTERS). Читаются только один раз,
   * в useState — App.tsx монтирует экран с key={tab}, поэтому смена вкладки размонтирует
   * прежний экран целиком, а не подсовывает новый initialFilters уже смонтированному.
   */
  initialFilters: ApplicationsFilters;
  syncSummary: SyncSummary | null;
  onSyncSummaryDismiss: () => void;
  notification: NotificationController;
}
