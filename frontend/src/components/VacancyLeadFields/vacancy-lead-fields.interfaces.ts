import type { VacancyLead } from '../../types/vacancy-search.interfaces';

export interface VacancyLeadFieldsProps {
  lead: VacancyLead;
}

export interface ReadOnlyCellProps {
  flex: string;
  label: string;
  value: string;
}
