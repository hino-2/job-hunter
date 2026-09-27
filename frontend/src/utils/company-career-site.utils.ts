import { COMPANY_MAX_LENGTH, URL_MAX_LENGTH } from '../constants/application.constants';
import {
  COMPANY_CAREER_SITE_NAME_REQUIRED_MESSAGE,
  COMPANY_CAREER_SITE_NAME_TOO_LONG_MESSAGE,
  COMPANY_CAREER_SITE_URL_INVALID_MESSAGE,
  COMPANY_CAREER_SITE_URL_REQUIRED_MESSAGE,
  COMPANY_CAREER_SITE_URL_TOO_LONG_MESSAGE,
} from '../constants/company-career-site.constants';
import { isSavableUrl } from './url.utils';

/**
 * Валидаторы полей «Сайты компаний» (§5.9, §7.9): заведомо невалидное значение
 * не отправляется на сервер вовсе (§10) — поле показывает error/helperText вместо
 * гарантированного 400. null — «значение годится к сохранению».
 */
export function validateCompanyCareerSiteName(value: string): string | null {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return COMPANY_CAREER_SITE_NAME_REQUIRED_MESSAGE;
  }

  if (trimmed.length > COMPANY_MAX_LENGTH) {
    return COMPANY_CAREER_SITE_NAME_TOO_LONG_MESSAGE;
  }

  return null;
}

/**
 * isSavableUrl (url.utils.ts) сама по себе разрешает пустую строку — там это «очистка
 * поля в null» для необязательных полей отклика. Здесь ссылка обязательна (§5.9),
 * поэтому пустое значение проверяется первым отдельным правилом.
 */
export function validateCompanyCareerSiteUrl(value: string): string | null {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return COMPANY_CAREER_SITE_URL_REQUIRED_MESSAGE;
  }

  if (!isSavableUrl(trimmed)) {
    return COMPANY_CAREER_SITE_URL_INVALID_MESSAGE;
  }

  if (trimmed.length > URL_MAX_LENGTH) {
    return COMPANY_CAREER_SITE_URL_TOO_LONG_MESSAGE;
  }

  return null;
}
