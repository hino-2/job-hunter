/**
 * §4.14: литералы общие для всего модуля company-sites/ — env-ключи транспорта,
 * лимиты, имена таблицы/колонок/маршрутов ресурса company-career-sites, паттерны
 * разбора HTML и тексты сообщений. Per-parser литералы (хосты, эндпойнты, регексы
 * разметки) живут в parsers/<key>/<key>.constants.ts — этот файл их не знает.
 */

export const COMPANY_SITE_USER_AGENT_ENV_KEY = 'COMPANY_SITE_USER_AGENT';
export const COMPANY_SITE_REQUEST_TIMEOUT_MS_ENV_KEY = 'COMPANY_SITE_REQUEST_TIMEOUT_MS';
export const COMPANY_SITE_MAX_RETRIES_ENV_KEY = 'COMPANY_SITE_MAX_RETRIES';
export const COMPANY_SITE_MAX_REQUESTS_PER_SECOND_ENV_KEY = 'COMPANY_SITE_MAX_REQUESTS_PER_SECOND';

/**
 * §4.14: у company-sites/ нет baseUrl намеренно — единого базового хоста нет, каждый
 * парсер ходит на свой константный хост (или, у hh-search, на абсолютный URL строки
 * CompanyCareerSite). VacancyHttpEnvKeys.baseUrl опционален ровно ради этого (§4.14/B1).
 */
export const COMPANY_SITE_HTTP_ENV_KEYS = {
  timeoutMs: COMPANY_SITE_REQUEST_TIMEOUT_MS_ENV_KEY,
  userAgent: COMPANY_SITE_USER_AGENT_ENV_KEY,
};

/**
 * §4.14: корневой сертификат «Russian Trusted Root CA» (Минцифры России). Им подписана
 * цепочка team.rzd.ru, а в хранилище доверенных корней Node его нет — без него любой
 * запрос к РЖД падает с «self-signed certificate in certificate chain». Доверие
 * добавляется ТОЛЬКО HTTP-клиенту модуля company-sites/ (httpsAgent в
 * buildCompanySiteHttpOptions), а не процессу целиком: остальные источники этот
 * корень не используют, и расширять им доверие незачем.
 *
 * Скачан с официальной страницы Госуслуг
 * (https://gu-st.ru/content/lending/russian_trusted_root_ca_pem.crt) 27.09.2026;
 * отпечаток SHA-256
 * D2:6D:2D:02:31:B7:C3:9F:92:CC:73:85:12:BA:54:10:35:19:E4:40:5D:68:B5:BD:70:3E:97:88:CA:8E:CF:31
 * совпадает с корнем, который отдаёт сам team.rzd.ru в TLS-цепочке. Срок действия —
 * до 27.02.2032.
 */
export const RUSSIAN_TRUSTED_ROOT_CA_PEM = `-----BEGIN CERTIFICATE-----
MIIFwjCCA6qgAwIBAgICEAAwDQYJKoZIhvcNAQELBQAwcDELMAkGA1UEBhMCUlUx
PzA9BgNVBAoMNlRoZSBNaW5pc3RyeSBvZiBEaWdpdGFsIERldmVsb3BtZW50IGFu
ZCBDb21tdW5pY2F0aW9uczEgMB4GA1UEAwwXUnVzc2lhbiBUcnVzdGVkIFJvb3Qg
Q0EwHhcNMjIwMzAxMjEwNDE1WhcNMzIwMjI3MjEwNDE1WjBwMQswCQYDVQQGEwJS
VTE/MD0GA1UECgw2VGhlIE1pbmlzdHJ5IG9mIERpZ2l0YWwgRGV2ZWxvcG1lbnQg
YW5kIENvbW11bmljYXRpb25zMSAwHgYDVQQDDBdSdXNzaWFuIFRydXN0ZWQgUm9v
dCBDQTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBAMfFOZ8pUAL3+r2n
qqE0Zp52selXsKGFYoG0GM5bwz1bSFtCt+AZQMhkWQheI3poZAToYJu69pHLKS6Q
XBiwBC1cvzYmUYKMYZC7jE5YhEU2bSL0mX7NaMxMDmH2/NwuOVRj8OImVa5s1F4U
zn4Kv3PFlDBjjSjXKVY9kmjUBsXQrIHeaqmUIsPIlNWUnimXS0I0abExqkbdrXbX
YwCOXhOO2pDUx3ckmJlCMUGacUTnylyQW2VsJIyIGA8V0xzdaeUXg0VZ6ZmNUr5Y
Ber/EAOLPb8NYpsAhJe2mXjMB/J9HNsoFMBFJ0lLOT/+dQvjbdRZoOT8eqJpWnVD
U+QL/qEZnz57N88OWM3rabJkRNdU/Z7x5SFIM9FrqtN8xewsiBWBI0K6XFuOBOTD
4V08o4TzJ8+Ccq5XlCUW2L48pZNCYuBDfBh7FxkB7qDgGDiaftEkZZfApRg2E+M9
G8wkNKTPLDc4wH0FDTijhgxR3Y4PiS1HL2Zhw7bD3CbslmEGgfnnZojNkJtcLeBH
BLa52/dSwNU4WWLubaYSiAmA9IUMX1/RpfpxOxd4Ykmhz97oFbUaDJFipIggx5sX
ePAlkTdWnv+RWBxlJwMQ25oEHmRguNYf4Zr/Rxr9cS93Y+mdXIZaBEE0KS2iLRqa
OiWBki9IMQU4phqPOBAaG7A+eP8PAgMBAAGjZjBkMB0GA1UdDgQWBBTh0YHlzlpf
BKrS6badZrHF+qwshzAfBgNVHSMEGDAWgBTh0YHlzlpfBKrS6badZrHF+qwshzAS
BgNVHRMBAf8ECDAGAQH/AgEEMA4GA1UdDwEB/wQEAwIBhjANBgkqhkiG9w0BAQsF
AAOCAgEAALIY1wkilt/urfEVM5vKzr6utOeDWCUczmWX/RX4ljpRdgF+5fAIS4vH
tmXkqpSCOVeWUrJV9QvZn6L227ZwuE15cWi8DCDal3Ue90WgAJJZMfTshN4OI8cq
W9E4EG9wglbEtMnObHlms8F3CHmrw3k6KmUkWGoa+/ENmcVl68u/cMRl1JbW2bM+
/3A+SAg2c6iPDlehczKx2oa95QW0SkPPWGuNA/CE8CpyANIhu9XFrj3RQ3EqeRcS
AQQod1RNuHpfETLU/A2gMmvn/w/sx7TB3W5BPs6rprOA37tutPq9u6FTZOcG1Oqj
C/B7yTqgI7rbyvox7DEXoX7rIiEqyNNUguTk/u3SZ4VXE2kmxdmSh3TQvybfbnXV
4JbCZVaqiZraqc7oZMnRoWrXRG3ztbnbes/9qhRGI7PqXqeKJBztxRTEVj8ONs1d
WN5szTwaPIvhkhO3CO5ErU2rVdUr89wKpNXbBODFKRtgxUT70YpmJ46VVaqdAhOZ
D9EUUn4YaeLaS8AjSF/h7UkjOibNc4qVDiPP+rkehFWM66PVnP1Msh93tc+taIfC
EYVMxjh8zNbFuoc7fzvvrFILLe7ifvEIUqSVIC/AzplM/Jxw7buXFeGP1qVCBEHq
391d/9RAfaZ12zkwFsl+IKwE/OZxW8AHa9i1p4GO0YSNuczzEm4=
-----END CERTIFICATE-----
`;

/**
 * §4.11.1/§4.14: сайты компаний не читают настройки поиска (нет своего поискового
 * запроса — ключевые слова профиля заменяют его целиком, §4.11.4), поэтому колонки
 * шаблона в vacancy_search_settings у них нет. Сентинел — фиксированная строка,
 * проходящая через isValidSearchUrlTemplate/buildSearchUrlTemplateBySource тем же
 * контрактом Record<VacancyLeadSearchSource, string>, что и у остальных источников,
 * ничего не означая по содержанию.
 */
export const COMPANY_SITE_SEARCH_URL_TEMPLATE_SENTINEL = 'company-sites';

/**
 * §4.14: потолок числа страниц списка на одну компанию за один прогон —
 * ponytail-ограничение (см. collectPagedVacancies, company-sites.helpers.ts):
 * добросовестные источники (§4.14 — планируемые JSON-эндпоинты Stage 3) отдают
 * заметно меньше страниц, а зацикленный список останавливается здесь, а не листает
 * вечно в рамках бюджета всего прогона (VACANCY_SCAN_MAX_PAGES).
 */
export const COMPANY_SITE_MAX_LIST_PAGES = 50;

/**
 * §4.14/D11: текст короче этого порога считается пустой SPA-оболочкой (описание не
 * отрендерилось на сервере) — fail-closed, а не сохранение вакансии без описания.
 */
export const COMPANY_SITE_MIN_DESCRIPTION_CHARS = 200;

export const COMPANY_CAREER_SITES_TABLE = 'company_career_sites';

/** Свойство сущности CompanyCareerSite → имя колонки в БД. */
export const COMPANY_CAREER_SITE_COLUMN = {
  ID: 'id',
  NAME: 'name',
  URL: 'url',
  CREATED_AT: 'created_at',
  UPDATED_AT: 'updated_at',
} as const;

export const COMPANY_CAREER_SITES_ROUTE = 'company-career-sites';
export const COMPANY_CAREER_SITE_ID_PARAM = 'id';
export const COMPANY_CAREER_SITE_BY_ID_ROUTE = ':id';

/** §5.9: GET отдаёт список, отсортированный по имени — стабильный порядок для UI-таблицы. */
export const COMPANY_CAREER_SITES_ORDER = { name: 'ASC', id: 'ASC' } as const;

/**
 * §5.9: те же правила, что URL_VALIDATION_OPTIONS (applications.constants.ts), но
 * require_protocol: true — строка сайта компании не пользовательская ссылка на
 * конкретную вакансию (там разрешена схема по умолчанию), а адрес, который парсеры
 * читают буквально (CompanySiteParserRegistry.resolve, SSRF-граница §4.14), поэтому
 * схема обязана присутствовать явно.
 *
 * Копия предупреждения URL_VALIDATION_OPTIONS: передавать в @IsUrl только КОПИЮ
 * ({ ...COMPANY_CAREER_SITE_URL_VALIDATION_OPTIONS }) — validator мутирует объект.
 */
export const COMPANY_CAREER_SITE_URL_VALIDATION_OPTIONS = Object.freeze({
  protocols: ['http', 'https'],
  require_protocol: true,
  require_tld: true,
});

/**
 * §4.14/D11: HTML описания вакансии сайта компании → plain text. Порядок вырезки —
 * script/style/noscript целиком (их содержимое не текст страницы), затем предпочтение
 * <main> над <body> над всем документом (см. extractPageText, company-sites.helpers.ts).
 */
export const HTML_SCRIPT_STYLE_BLOCK_PATTERN = /<(script|style|noscript)\b[\s\S]*?<\/\1>/gi;
export const HTML_MAIN_BLOCK_PATTERN = /<main\b[^>]*>([\s\S]*?)<\/main>/i;
export const HTML_BODY_BLOCK_PATTERN = /<body\b[^>]*>([\s\S]*?)<\/body>/i;

export const MD5_ALGORITHM = 'md5';
export const HEX_ENCODING = 'hex';

export const COMPANY_CAREER_SITE_NOT_FOUND_MESSAGE = 'Сайт компании не найден';

export const COMPANY_SITE_TRANSPORT_ERROR_MESSAGE = 'Запрос к сайту компании не выполнен';
export const COMPANY_SITE_UNEXPECTED_STATUS_MESSAGE = 'Сайт компании ответил статусом';
export const COMPANY_SITE_RATE_LIMITED_MESSAGE = 'Сайт компании ограничил частоту запросов';
export const COMPANY_SITE_NOT_FOUND_MESSAGE = 'Страница на сайте компании не найдена';
export const COMPANY_SITE_NOT_HTML_MESSAGE = 'Ответ сайта компании не HTML';

/**
 * §4.14/Stage 3: JSON-парсеры (aviasales/rzd/wildberries/magnit-tech/dodo) запрашивают
 * Accept: application/json, а не VACANCY_ACCEPT_HEADER_VALUE (text/html) — некоторые
 * из этих API отдают иное тело (например, HTML страницу ошибки) без него.
 */
export const COMPANY_SITE_JSON_ACCEPT_HEADER_VALUE = 'application/json';
export const COMPANY_SITE_NOT_JSON_MESSAGE = 'Ответ сайта компании не JSON';
export const COMPANY_SITE_DESCRIPTION_MISSING_MESSAGE =
  'Не удалось получить описание вакансии с сайта компании';
export const COMPANY_SITE_PARSER_MISSING_MESSAGE = 'Парсер сайта компании не реализован';
export const COMPANY_SITE_LIST_FAILED_MESSAGE = 'Не удалось прочитать список сайтов компаний';
