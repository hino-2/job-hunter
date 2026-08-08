export interface AppHeaderProps {
  openCount: number;
  totalCount: number;
  /** Чисел ещё (или уже) нет: и загрузка, и ошибка запроса счётчика. */
  isCountsUnknown: boolean;
  /** Колбэк появится на шаге 10 (§7.7). */
  onSyncAllOpen?: () => void;
}
