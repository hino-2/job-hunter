/**
 * Колбэки исхода живут в опциях хука, а не в вызове mutate() — тем же приёмом,
 * что у остальных мутаций этого раздела.
 */
export interface DeleteCompanyCareerSiteOptions {
  onFailed: (error: Error) => void;
}
