/** Колбэки исхода живут в опциях хука, а не в вызове mutate() (см. use-create-application). */
export interface DeleteApplicationOptions {
  onDeleted: (id: string) => void;
  onFailed: (error: Error) => void;
}
