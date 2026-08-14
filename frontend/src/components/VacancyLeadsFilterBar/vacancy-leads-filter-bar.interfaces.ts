import type { VacancyLeadsFilters } from '../../types/vacancy-search.interfaces';

export interface VacancyLeadsFilterBarProps {
  filters: VacancyLeadsFilters;
  onFiltersChange: (filters: VacancyLeadsFilters) => void;
  onScan: () => void;
  /** §7.9.2: кнопка дизейблится и меняет подпись, пока идёт прогон. */
  isScanRunning: boolean;
  onOpenSettings: () => void;
}
