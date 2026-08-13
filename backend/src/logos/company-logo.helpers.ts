import {
  COMPANY_LOGO_CONTENT_TYPES,
  COMPANY_LOGO_EXTENSION_CONTENT_TYPES,
  COMPANY_LOGO_FILE_NAME_PATTERN,
  COMPANY_LOGO_FILE_NAME_SEPARATOR,
  COMPANY_LOGO_REDIRECT_HOST_REJECTED_MESSAGE,
  CONTENT_TYPE_PARAMS_SEPARATOR,
} from './company-logo.constants';
import type { CompanyLogoRedirectOptions } from './company-logo.interfaces';
import type { CompanyLogoExtension } from './company-logo.type';

/** `<fileKey>.<extension>` — имя файла на диске (§4.10). Чистая функция, без DI. */
export function buildCompanyLogoFileName(fileKey: string, extension: CompanyLogoExtension): string {
  return `${fileKey}${COMPANY_LOGO_FILE_NAME_SEPARATOR}${extension}`;
}

/**
 * Защита в глубину от path traversal (§4.10): значение из колонки БД проверяется
 * этим паттерном ещё раз перед тем, как участвовать в path.join, независимо от того,
 * что записать туда что-то другое, кроме результата buildCompanyLogoFileName, коду
 * негде.
 */
export function isCompanyLogoFileName(value: string): boolean {
  return COMPANY_LOGO_FILE_NAME_PATTERN.test(value);
}

/**
 * Content-Type ответа CDN → расширение из белого списка, либо null (§4.10). Параметры
 * после ';' (например «image/png; charset=binary») отрезаются, регистр и пробелы
 * по краям нормализуются: CDN хостов hh.ru/getmatch.ru не гарантируют канонический вид.
 */
export function resolveLogoExtension(
  rawContentType: string | undefined,
): CompanyLogoExtension | null {
  if (rawContentType === undefined) {
    return null;
  }

  const normalized = rawContentType.split(CONTENT_TYPE_PARAMS_SEPARATOR)[0]?.trim().toLowerCase();

  if (normalized === undefined) {
    return null;
  }

  return (
    (COMPANY_LOGO_CONTENT_TYPES as Record<string, CompanyLogoExtension | undefined>)[normalized] ??
    null
  );
}

/** Обратная карта: расширение уже проверенного имени файла → Content-Type ответа (§4.10). */
export function resolveLogoContentType(fileName: string): string | null {
  const extension = fileName.split(COMPANY_LOGO_FILE_NAME_SEPARATOR).pop();

  if (extension === undefined) {
    return null;
  }

  return (
    (COMPANY_LOGO_EXTENSION_CONTENT_TYPES as Record<string, string | undefined>)[extension] ?? null
  );
}

/**
 * SSRF-защита редиректов (§4.10): resolveVacancyLogoUrl проверяет allow-list только
 * для исходного URL, а дальше follow-redirects сам, без вопросов, идёт по Location
 * до COMPANY_LOGO_MAX_REDIRECTS раз — в том числе на произвольный хост. Guard
 * повторяет ту же проверку на КАЖДОМ хопе и бросает, если хост цели редиректа не
 * входит в allow-list источника; бросок долетает до CompanyLogoService.download как
 * ошибка запроса axios — метод не выпускает исключений наружу и превращает её
 * в null (как любой другой сбой сети), а причина остаётся в тексте ошибки для лога.
 *
 * Чистая функция-фабрика, без DI: логирование — забота вызывающего сервиса.
 */
export function buildCompanyLogoRedirectGuard(
  allowedHostPattern: RegExp,
): (options: CompanyLogoRedirectOptions) => void {
  return (options) => {
    const { hostname } = options;

    // hostname не строка — follow-redirects такого не отдаёт, но раз уж значение
    // из индексной сигнатуры типизировано как unknown, узкий хост fail-safe:
    // не смогли убедиться, что редирект ведёт на allowed-хост — обрываем скачивание.
    if (typeof hostname !== 'string' || !allowedHostPattern.test(hostname)) {
      throw new Error(`${COMPANY_LOGO_REDIRECT_HOST_REJECTED_MESSAGE}: ${String(hostname)}`);
    }
  };
}
