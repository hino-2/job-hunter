import type { VacancyLead } from '../../types/vacancy-search.interfaces';

export interface VacancyLeadAccordionProps {
  lead: VacancyLead;
  expanded: boolean;
  onToggle: (id: string, expanded: boolean) => void;
  onToggleHidden: (id: string, hidden: boolean) => void;
  /** Летит ли сейчас POST :id/apply для этого лида (§7.9.1) — срез-boolean, не набор. */
  isApplying: boolean;
  onApply: (id: string) => void;
}
