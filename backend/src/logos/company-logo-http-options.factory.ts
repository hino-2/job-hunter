import type { HttpModuleOptions } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

import {
  ACCEPT_HEADER_NAME,
  COMPANY_LOGO_ACCEPT_HEADER_VALUE,
  COMPANY_LOGO_HTTP_ENV_KEYS,
  COMPANY_LOGO_MAX_BYTES,
  COMPANY_LOGO_MAX_REDIRECTS,
  COMPANY_LOGO_RESPONSE_TYPE,
} from './company-logo.constants';

/**
 * Опции axios для скачивания логотипов (§4.10). В отличие от
 * vacancy-http-options.factory.ts здесь нет baseURL: запрос идёт на уже абсолютный
 * URL, полученный от парсера страницы источника (проверенный allow-list'ом хоста
 * ДО попадания сюда), а не собирается из базы конкретного сайта.
 *
 * validateStatus: всегда true — тем же принципом, что у vacancies/hh/getmatch:
 * CompanyLogoService сам разбирает статус и никогда не выпускает исключение наружу.
 *
 * maxRedirects > 0 (SSRF, §4.10): allow-list хоста источника проверен только для
 * исходного URL, а CDN может 3xx-нуть на произвольный хост. beforeRedirect здесь
 * НЕ регистрируется — allow-list у каждого источника свой, а этот factory общий
 * для всех запросов клиента; guard собирается на каждый вызов в
 * CompanyLogoService.download через buildCompanyLogoRedirectGuard и передаётся
 * per-request, где и известен конкретный allowedHostPattern.
 */
export function buildCompanyLogoHttpOptions(configService: ConfigService): HttpModuleOptions {
  return {
    timeout: configService.getOrThrow<number>(COMPANY_LOGO_HTTP_ENV_KEYS.timeoutMs),
    headers: {
      [ACCEPT_HEADER_NAME]: COMPANY_LOGO_ACCEPT_HEADER_VALUE,
    },
    validateStatus: () => true,
    responseType: COMPANY_LOGO_RESPONSE_TYPE,
    maxRedirects: COMPANY_LOGO_MAX_REDIRECTS,
    maxContentLength: COMPANY_LOGO_MAX_BYTES,
    maxBodyLength: COMPANY_LOGO_MAX_BYTES,
  };
}
