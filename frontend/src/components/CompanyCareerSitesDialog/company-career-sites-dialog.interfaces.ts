/** Диалог «Сайты компаний» на экране «Вакансии» (§7.9.5, §4.14). */
export interface CompanyCareerSitesDialogProps {
  onClose: () => void;
  /** Текст ошибки уходит наверх в общий Snackbar экрана (§7.3) — своего у диалога нет. */
  onError: (message: string) => void;
}
