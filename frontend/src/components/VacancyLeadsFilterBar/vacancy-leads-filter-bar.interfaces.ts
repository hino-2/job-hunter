import type { ScanResumeState, VacancyLeadsFilters } from '../../types/vacancy-search.interfaces';
import type { VacancyLeadSearchSource } from '../../types/vacancy-search.type';

export interface VacancyLeadsFilterBarProps {
  filters: VacancyLeadsFilters;
  onFiltersChange: (filters: VacancyLeadsFilters) => void;
  /** §5.7, §7.9.2: источник, чью выдачу разберёт следующий прогон. */
  scanSource: VacancyLeadSearchSource;
  onScanSourceChange: (source: VacancyLeadSearchSource) => void;
  onScanFresh: () => void;
  onScanResume: () => void;
  onScanStop: () => void;
  /** §7.9.2, §4.11.12: «Начать»/«Продолжить» дизейблятся, пока идёт прогон. */
  isScanRunning: boolean;
  /** §4.11.12: «Остановить» дизейблится, если остановка уже запрошена. */
  isStopRequested: boolean;
  isStartPending: boolean;
  isStopPending: boolean;
  /** §4.11.12: доступность «Продолжить» и номер страницы в её подписи — срез выбранного источника. */
  resume: ScanResumeState;
  onOpenSettings: () => void;
}
