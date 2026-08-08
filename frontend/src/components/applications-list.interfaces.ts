import type { InlineEditHandlers } from '../hooks/use-inline-edits.interfaces';
import type { PendingById, SavedById } from '../hooks/use-inline-edits.type';
import type { Application } from '../types/application.interfaces';

export interface ApplicationsListProps {
  applications: readonly Application[];
  isPending: boolean;
  isError: boolean;
  /** Прячет ли текущий фильтр часть записей — от этого зависит текст пустого состояния. */
  isFilterActive: boolean;
  onRetry: () => void;
  onResetFilters: () => void;
  isExpanded: (id: string) => boolean;
  onToggle: (id: string, expanded: boolean) => void;
  /** Словари целиком: в аккордеон уходит только срез по его id (§7.3). */
  pendingById: PendingById;
  savedById: SavedById;
  editHandlers: InlineEditHandlers;
  onAdd?: () => void;
  /** id записей с летящим /sync (§7.6) — в аккордеон уходит срез-boolean по id. */
  syncingIds: ReadonlySet<string>;
  onSync: (id: string) => void;
  onDelete?: (id: string) => void;
}
