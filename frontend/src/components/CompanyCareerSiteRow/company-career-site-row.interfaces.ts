import type { CompanyCareerSite } from '../../types/company-career-site.interfaces';

/** Одна строка таблицы «Сайты компаний» (§7.9, §4.14). */
export interface CompanyCareerSiteRowProps {
  site: CompanyCareerSite;
  /** Текст ошибки уходит наверх в общий Snackbar экрана (§7.3) — своего у раздела нет. */
  onError: (message: string) => void;
}
