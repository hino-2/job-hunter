import type { VacancyLead } from '../../types/vacancy-search.interfaces';

export interface VacancyLeadSummaryRowProps {
  lead: VacancyLead;
  /** Тумблер скрытия/возврата (§7.9.1, §7.9.3): вызывающий сам решает, каким значением hidden. */
  onToggleHidden: (id: string, hidden: boolean) => void;
}
