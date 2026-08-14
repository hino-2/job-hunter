import type { VacancyLead } from '../../types/vacancy-search.interfaces';

export interface VacancyLeadsListProps {
  leads: readonly VacancyLead[];
  isPending: boolean;
  isError: boolean;
  /** Активен ли поиск по тексту (§7.9.1) — отдельно от «Скрытые»: у пустого списка
   *  под каждым фильтром свой текст. */
  isSearchActive: boolean;
  /** Открыт ли режим «Скрытые» (hidden=only, §7.9.3) — у него собственный пустой текст. */
  isHiddenView: boolean;
  onRetry: () => void;
  onResetFilters: () => void;
  expandedIds: ReadonlySet<string>;
  onToggle: (id: string, expanded: boolean) => void;
  onToggleHidden: (id: string, hidden: boolean) => void;
}
