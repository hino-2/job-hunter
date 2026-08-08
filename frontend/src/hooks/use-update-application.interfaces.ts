import type { ApplicationUpdate } from '../types/application.interfaces';

/** Аргументы мутации PATCH /api/applications/:id (§5.1). */
export interface UpdateApplicationVariables {
  id: string;
  patch: ApplicationUpdate;
}

/**
 * Колбэки исхода живут в опциях хука, а не в вызове mutate().
 *
 * MutationObserver у useMutation один: второй mutate() отцепляет предыдущую мутацию
 * от наблюдателя, и переданные в тот вызов колбэки уже не сработают. Правки при автосейве
 * идут внахлёст постоянно, поэтому ошибка первой из них так потерялась бы молча (§7.3).
 * Опции хука хранит сама мутация — они отрабатывают всегда.
 */
export interface UpdateApplicationOptions {
  onSaved: (variables: UpdateApplicationVariables) => void;
  onFailed: (error: Error) => void;
}
