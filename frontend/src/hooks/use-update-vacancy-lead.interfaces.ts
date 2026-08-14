/** Аргументы мутации PATCH /api/vacancy-leads/:id (§5.7, §7.9.3). */
export interface UpdateVacancyLeadVariables {
  id: string;
  hidden: boolean;
}

/**
 * Колбэки исхода живут в опциях хука, а не в вызове mutate() — та же причина, что
 * у UpdateApplicationOptions: второй mutate() (клик 🚫 на двух строках подряд)
 * отцепляет предыдущую мутацию от MutationObserver.
 */
export interface UpdateVacancyLeadOptions {
  onToggled: (variables: UpdateVacancyLeadVariables) => void;
  /** variables нужны, чтобы выбрать fallback-текст: «не скрыть» или «не вернуть» (§7.9.3). */
  onFailed: (error: Error, variables: UpdateVacancyLeadVariables) => void;
}
