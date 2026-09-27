/** Раздел «Сайты компаний» на экране «Вакансии» (§7.9, §4.14). */
export interface CompanyCareerSitesSectionProps {
  /** Текст ошибки уходит наверх в общий Snackbar экрана (§7.3) — своего у раздела нет. */
  onError: (message: string) => void;
}
