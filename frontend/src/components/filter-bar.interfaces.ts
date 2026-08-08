import type { ApplicationsFilters } from '../types/application.interfaces';

export interface FilterBarProps {
  filters: ApplicationsFilters;
  onFiltersChange: (filters: ApplicationsFilters) => void;
  isAllExpanded: boolean;
  onToggleExpandAll: () => void;
  /** Колбэк появится на шаге 9 (§7.4). */
  onAdd?: () => void;
}
