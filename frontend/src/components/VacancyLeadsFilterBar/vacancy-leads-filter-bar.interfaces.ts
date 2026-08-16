import type { ScanResumeState, VacancyLeadsFilters } from '../../types/vacancy-search.interfaces';

export interface VacancyLeadsFilterBarProps {
  filters: VacancyLeadsFilters;
  onFiltersChange: (filters: VacancyLeadsFilters) => void;
  onScanFresh: () => void;
  onScanResume: () => void;
  onScanStop: () => void;
  /** §7.9.2, §4.11.12: «Начать»/«Продолжить» дизейблятся, пока идёт прогон. */
  isScanRunning: boolean;
  /** §4.11.12: «Остановить» дизейблится, если остановка уже запрошена. */
  isStopRequested: boolean;
  isStartPending: boolean;
  isStopPending: boolean;
  /** §4.11.12: доступность «Продолжить» и номер страницы в её подписи. */
  resume: ScanResumeState;
  onOpenSettings: () => void;
}
