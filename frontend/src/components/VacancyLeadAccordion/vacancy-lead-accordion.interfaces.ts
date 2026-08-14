import type { VacancyLead } from '../../types/vacancy-search.interfaces';

export interface VacancyLeadAccordionProps {
  lead: VacancyLead;
  expanded: boolean;
  onToggle: (id: string, expanded: boolean) => void;
  onToggleHidden: (id: string, hidden: boolean) => void;
}
