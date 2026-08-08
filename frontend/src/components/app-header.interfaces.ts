export interface AppHeaderProps {
  openCount: number;
  totalCount: number;
  /** Чисел ещё (или уже) нет: и загрузка, и ошибка запроса счётчика. */
  isCountsUnknown: boolean;
  /** §7.7: прогон в полёте — LinearProgress под Toolbar, кнопка disabled с «Обновляем…». */
  isSyncingAll: boolean;
  onSyncAllOpen: () => void;
}
