/** Управление раскрытостью аккордеонов (§7.2): множество id, раскрытие независимое. */
export interface ExpandedIdsController {
  isExpanded: (id: string) => boolean;
  toggle: (id: string, expanded: boolean) => void;
  /** Понадобится шагу 9: только что созданная запись открывается раскрытой (§7.2). */
  expand: (id: string) => void;
  expandAll: (ids: readonly string[]) => void;
  collapseAll: () => void;
  areAllExpanded: (ids: readonly string[]) => boolean;
}
