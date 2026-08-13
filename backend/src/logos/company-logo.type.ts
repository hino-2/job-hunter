import type { COMPANY_LOGO_CONTENT_TYPES } from './company-logo.constants';

/** Расширения файлов логотипов на диске — значения белого списка Content-Type (§4.10). */
export type CompanyLogoExtension =
  (typeof COMPANY_LOGO_CONTENT_TYPES)[keyof typeof COMPANY_LOGO_CONTENT_TYPES];
