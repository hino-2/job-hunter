/**
 * Мутаторы раскрытости. Идентичность объекта не меняется за всё время жизни экрана —
 * это контракт, а не совпадение: объект уходит в deps handleToggle, а тот — пропом
 * в memo-аккордеон, поэтому смена ссылки на actions пробила бы memo для всего списка.
 */
export interface ExpandedIdsActions {
  toggle: (id: string, expanded: boolean) => void;
  /** Только что созданная запись открывается раскрытой (§7.2, §13.5). */
  expand: (id: string) => void;
  expandAll: (ids: readonly string[]) => void;
  collapseAll: () => void;
}

export interface ExpandedIdsController {
  expandedIds: ReadonlySet<string>;
  actions: ExpandedIdsActions;
}
