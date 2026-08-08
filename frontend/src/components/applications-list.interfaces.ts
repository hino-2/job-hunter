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
  onAdd?: () => void;
  onSync?: (id: string) => void;
  onDelete?: (id: string) => void;
}
