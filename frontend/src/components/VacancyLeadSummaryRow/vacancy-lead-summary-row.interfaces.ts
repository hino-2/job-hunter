import type { VacancyLead } from '../../types/vacancy-search.interfaces';

export interface VacancyLeadSummaryRowProps {
  lead: VacancyLead;
  /** Тумблер скрытия/возврата (§7.9.1, §7.9.3): вызывающий сам решает, каким значением hidden. */
  onToggleHidden: (id: string, hidden: boolean) => void;
  /** Летит ли сейчас POST :id/apply для этого лида (§7.9.1) — срез-boolean, не набор. */
  isApplying: boolean;
  onApply: (id: string) => void;
}
