/**
 * Все литералы модуля vacancy-search: имена таблиц/колонок/индексов обеих таблиц
 * (§3.5, §3.6), ширины колонок, значения match_source (§4.12) — по тому же правилу,
 * что и applications.constants.ts (единственный источник snake_case-имён для своих
 * таблиц). Enum match_source объявлен как `as const`-объект по той же причине, что
 * SYNC_OUTCOME/VACANCY_SOURCE в applications.constants.ts (§10 пп.3–4).
 */

import { VACANCY_SOURCE } from '../applications/applications.constants';
import type { ScanStoppedReason } from './vacancy-search.type';

export const VACANCY_LEADS_TABLE = 'vacancy_leads';

export const VACANCY_SEARCH_SETTINGS_TABLE = 'vacancy_search_settings';

/** Свойство сущности VacancyLead → имя колонки в БД. */
export const VACANCY_LEAD_COLUMN = {
  ID: 'id',
  SOURCE: 'source',
  EXTERNAL_ID: 'external_id',
  POSITION: 'position',
  COMPANY: 'company',
  POSITION_KEY: 'position_key',
  COMPANY_KEY: 'company_key',
  PUBLISHED_ON: 'published_on',
  PUBLISHED_AT: 'published_at',
  VACANCY_URL: 'vacancy_url',
  AREA_NAME: 'area_name',
  SALARY_FROM: 'salary_from',
  SALARY_TO: 'salary_to',
  SALARY_CURRENCY: 'salary_currency',
  SALARY_GROSS: 'salary_gross',
  EXPERIENCE: 'experience',
  EMPLOYMENT_FORM: 'employment_form',
  WORK_FORMATS: 'work_formats',
  MATCHED_KEYWORDS: 'matched_keywords',
  MATCH_SOURCE: 'match_source',
  AI_MODEL: 'ai_model',
  AI_TITLE_REASON: 'ai_title_reason',
  AI_DESCRIPTION_REASON: 'ai_description_reason',
  COMPANY_LOGO_FILE: 'company_logo_file',
  HIDDEN_AT: 'hidden_at',
  FIRST_SEEN_AT: 'first_seen_at',
  LAST_SEEN_AT: 'last_seen_at',
  CREATED_AT: 'created_at',
  UPDATED_AT: 'updated_at',
} as const;

/** Имена совпадают с миграцией, иначе migration:generate начнёт их пересоздавать (§3.5). */
export const VACANCY_LEAD_INDEX = {
  DEDUP_KEY: 'UQ_vacancy_leads_dedup_key',
  PUBLISHED_ON: 'IDX_vacancy_leads_published_on',
} as const;

/** §3.5: ширины колонок vacancy_leads — источник истины для entity и migration. */
export const VACANCY_LEAD_SOURCE_LENGTH = 16;
export const VACANCY_LEAD_EXTERNAL_ID_LENGTH = 32;
export const VACANCY_LEAD_POSITION_LENGTH = 255;
export const VACANCY_LEAD_COMPANY_LENGTH = 255;
export const VACANCY_LEAD_POSITION_KEY_LENGTH = 255;
export const VACANCY_LEAD_COMPANY_KEY_LENGTH = 255;
export const VACANCY_LEAD_AREA_NAME_LENGTH = 128;
export const VACANCY_LEAD_SALARY_CURRENCY_LENGTH = 8;
export const VACANCY_LEAD_EXPERIENCE_LENGTH = 32;
export const VACANCY_LEAD_EMPLOYMENT_FORM_LENGTH = 32;
export const VACANCY_LEAD_WORK_FORMATS_LENGTH = 64;
export const VACANCY_LEAD_MATCH_SOURCE_LENGTH = 16;
export const VACANCY_LEAD_AI_MODEL_LENGTH = 64;
export const VACANCY_LEAD_AI_REASON_LENGTH = 500;

/** §4.12: кто подтвердил соответствие вакансии профилю. */
export const MATCH_SOURCE = {
  KEYWORDS: 'KEYWORDS',
  AI: 'AI',
} as const;

export const DEFAULT_MATCH_SOURCE = MATCH_SOURCE.KEYWORDS;

/** Свойство сущности VacancySearchSettings → имя колонки в БД. */
export const VACANCY_SEARCH_SETTINGS_COLUMN = {
  ID: 'id',
  KEYWORDS: 'keywords',
  EXCLUDE_KEYWORDS: 'exclude_keywords',
  TITLE_PROMPT: 'title_prompt',
  DESCRIPTION_PROMPT: 'description_prompt',
  AI_ENABLED: 'ai_enabled',
  SEARCH_URL_TEMPLATE: 'search_url_template',
  IT_VACANCIES_SEARCH_URL_TEMPLATE: 'it_vacancies_search_url_template',
  UPDATED_AT: 'updated_at',
} as const;

/** §3.6: таблица — ровно одна строка, CHECK (id = 1). */
export const VACANCY_SEARCH_SETTINGS_SINGLETON_ID = 1;

export const VACANCY_SEARCH_SETTINGS_ID_CHECK = 'CHK_vacancy_search_settings_id';

/** §3.6/§4.11.1/§5.7: шаблон ссылки на выдачу hh.ru теперь колонка, а не env. */
export const VACANCY_SEARCH_SETTINGS_SEARCH_URL_TEMPLATE_LENGTH = 2048;

/** Имя ValidatorConstraint, проверяющего протокол и хост шаблона ссылки (search-url-template.validator.ts). */
export const SEARCH_URL_TEMPLATE_CONSTRAINT_NAME = 'searchUrlTemplateOrigin';

/** То же для шаблона ссылки на выдачу it-vacancies.ru (it-vacancies-search-url-template.validator.ts). */
export const IT_VACANCIES_SEARCH_URL_TEMPLATE_CONSTRAINT_NAME =
  'itVacanciesSearchUrlTemplateOrigin';

export const VACANCY_SEARCH_SETTINGS_ROUTE = 'vacancy-search-settings';

/** §5.7: оба промпта — не длиннее 8000 символов. */
export const VACANCY_SEARCH_SETTINGS_PROMPT_MAX_LENGTH = 8000;

/**
 * §3.6/§4.11.4: keywords/exclude_keywords хранятся строкой через запятую.
 * Разделитель при разборе — просто запятая (каждый кусок затем trim()'ится),
 * при сборке из массива на PUT — запятая с пробелом для читаемости в БД/UI.
 */
export const KEYWORD_LIST_SEPARATOR = ',';
export const KEYWORD_LIST_JOIN_SEPARATOR = ', ';

/** §4.11.4: нормализация ключевых/стоп-слов — ё → е, схлопывание пробельных серий. */
export const NORMALIZE_YO_PATTERN = /ё/g;
export const NORMALIZE_YO_REPLACEMENT = 'е';
export const NORMALIZE_WHITESPACE_PATTERN = /\s+/g;

/**
 * §3.6: строку засевает миграция CreateVacancySearchSettingsTable — сервис её
 * не создаёт (второй путь появления данных запрещён), отсутствие строки —
 * повреждение схемы.
 */
export const VACANCY_SEARCH_SETTINGS_MISSING_MESSAGE =
  'Настройки поиска вакансий не найдены: миграция не выполнена или строка удалена вручную';

/** §4.12.2: плейсхолдеры, обязательные в промптах — проверяются при PUT (§5.7). */
export const PLACEHOLDER_KEYWORDS_PATTERN = /\{keywords\}/;
export const PLACEHOLDER_TITLES_PATTERN = /\{titles\}/;
export const PLACEHOLDER_DESCRIPTION_PATTERN = /\{description\}/;

/**
 * §5.7: сообщения обязаны начинаться с имени поля — фронт кладёт текст под нужный
 * контрол по этому префиксу. $property подставляется class-validator'ом при сборке
 * ValidationError (тот же приём, что ISO_8601_INSTANT_VALIDATION_OPTIONS).
 */
export const VACANCY_SEARCH_SETTINGS_TITLE_PROMPT_MISSING_KEYWORDS_MESSAGE =
  '$property: обязан содержать плейсхолдер {keywords}';
export const VACANCY_SEARCH_SETTINGS_TITLE_PROMPT_MISSING_TITLES_MESSAGE =
  '$property: обязан содержать плейсхолдер {titles}';
export const VACANCY_SEARCH_SETTINGS_DESCRIPTION_PROMPT_MISSING_KEYWORDS_MESSAGE =
  '$property: обязан содержать плейсхолдер {keywords}';
export const VACANCY_SEARCH_SETTINGS_DESCRIPTION_PROMPT_MISSING_DESCRIPTION_MESSAGE =
  '$property: обязан содержать плейсхолдер {description}';

/**
 * §5.7: сообщения валидации searchUrlTemplate при PUT. Плейсхолдер проверяется
 * тем же паттерном, что и buildHhSearchUrl (перенесён в hh/hh.constants.ts,
 * потому что подстановка — его код); происхождение (https + hh.ru) проверяет
 * SearchUrlTemplateConstraint. Поисковый запрос — часть самой ссылки (свой
 * text=… у пользователя), отдельного плейсхолдера {text} больше нет.
 */
export const VACANCY_SEARCH_SETTINGS_SEARCH_URL_MISSING_PAGE_MESSAGE =
  '$property: обязан содержать плейсхолдер {page}, иначе прогон читал бы первую страницу бесконечно';
export const VACANCY_SEARCH_SETTINGS_SEARCH_URL_ORIGIN_MESSAGE =
  '$property: ссылка обязана начинаться с https:// и вести на hh.ru (или региональный домен hh)';

/**
 * §5.7: те же два сообщения для шаблона ссылки на выдачу it-vacancies.ru. Свои
 * константы, а не переиспользование hh-текстов: сообщение называет конкретный хост,
 * и фронт кладёт его под свой контрол по префиксу $property.
 */
export const VACANCY_SEARCH_SETTINGS_IT_VACANCIES_SEARCH_URL_MISSING_PAGE_MESSAGE =
  '$property: обязан содержать плейсхолдер {page}, иначе прогон читал бы первую страницу бесконечно';
export const VACANCY_SEARCH_SETTINGS_IT_VACANCIES_SEARCH_URL_ORIGIN_MESSAGE =
  '$property: ссылка обязана начинаться с https:// и вести на it-vacancies.ru';

/**
 * §4.11.1: строка засеивается той же миграцией, что и остальные поля (§3.6) —
 * повреждённое значение (руками правленный SQL) обнаруживается только при старте
 * прогона (VacancySearchSettingsService.getSnapshot), поэтому GET продолжает
 * отдавать его как есть — иначе пользователь не смог бы открыть диалог и починить.
 */
export const VACANCY_SEARCH_SETTINGS_INVALID_URL_TEMPLATE_MESSAGE =
  'Шаблон ссылки на выдачу в настройках повреждён: нет плейсхолдера {page} либо хост не hh.ru';
export const VACANCY_SEARCH_SETTINGS_INVALID_IT_VACANCIES_URL_TEMPLATE_MESSAGE =
  'Шаблон ссылки на выдачу в настройках повреждён: нет плейсхолдера {page} либо хост не it-vacancies.ru';

/** Общий делитель для бюджета по возрасту (§4.11.6, VACANCY_SCAN_MAX_AGE_DAYS). */
export const MS_IN_DAY = 86_400_000;

/** §5.7: маршруты VacancyLeadsController. scan/scan-stop/scan-status/:id/logo ОБЯЗАНЫ идти выше ':id' (то же правило, что у sync-open). */
export const VACANCY_LEADS_ROUTE = 'vacancy-leads';
export const VACANCY_LEAD_ID_PARAM = 'id';
export const VACANCY_LEAD_BY_ID_ROUTE = ':id';
export const VACANCY_LEADS_SCAN_ROUTE = 'scan';
export const VACANCY_LEADS_SCAN_STOP_ROUTE = 'scan/stop';
export const VACANCY_LEADS_SCAN_STATUS_ROUTE = 'scan/status';

/** §4.10, §4.11, §5.7: та же логика порядка маршрутов, что у APPLICATION_LOGO_ROUTE. */
export const VACANCY_LEAD_LOGO_ROUTE = `${VACANCY_LEAD_BY_ID_ROUTE}/logo`;

/**
 * §5.7 (создание отклика из лида): по тому же правилу порядка маршрутов, что и
 * scan/scan-stop/scan-status/:id/logo выше — объявляется в контроллере ВЫШЕ
 * методов с ':id', иначе Express сматчил бы 'apply' как значение :id.
 */
export const VACANCY_LEAD_APPLY_ROUTE = `${VACANCY_LEAD_BY_ID_ROUTE}/apply`;

export const LEAD_ALREADY_APPLIED_MESSAGE = 'Отклик по этой вакансии уже создан';

export const LEAD_APPLIED_LOG_MESSAGE = 'Из лида создан отклик';

export const VACANCY_LEADS_ALIAS = 'vacancyLead';

export const VACANCY_LEAD_NOT_FOUND_MESSAGE = 'Вакансия не найдена';

export const VACANCY_LEADS_SEARCH_MAX_LENGTH = 255;

/** §5.7: значения query-параметра hidden. */
export const VACANCY_LEADS_HIDDEN_FILTERS = ['exclude', 'only', 'all'] as const;
export const DEFAULT_VACANCY_LEADS_HIDDEN_FILTER = 'exclude';

export const VACANCY_LEADS_SORT_FIELDS = ['publishedAt', 'firstSeenAt'] as const;
export const DEFAULT_VACANCY_LEADS_SORT = 'publishedAt';

export const VACANCY_LEADS_ORDERS = ['asc', 'desc'] as const;
export const DEFAULT_VACANCY_LEADS_ORDER = 'desc';

export const VACANCY_LEADS_ORDER_DIRECTIONS = {
  asc: 'ASC',
  desc: 'DESC',
} as const;

/** Whitelist для ORDER BY — пользовательский ввод в SQL попадает только через эту статическую карту. */
export const VACANCY_LEADS_SORT_PROPERTIES = {
  publishedAt: 'publishedAt',
  firstSeenAt: 'firstSeenAt',
} as const;

/** Добивка сортировки: без неё записи с равным значением сортируемого поля отдаются в случайном порядке. */
export const VACANCY_LEADS_TIEBREAK_PROPERTY = 'id';

export const VACANCY_LEADS_SEARCH_CONDITION =
  `(${VACANCY_LEADS_ALIAS}.position ILIKE :search` +
  ` OR ${VACANCY_LEADS_ALIAS}.company ILIKE :search)`;

export const VACANCY_LEADS_HIDDEN_EXCLUDE_CONDITION = `${VACANCY_LEADS_ALIAS}.hiddenAt IS NULL`;
export const VACANCY_LEADS_HIDDEN_ONLY_CONDITION = `${VACANCY_LEADS_ALIAS}.hiddenAt IS NOT NULL`;

export const VACANCY_LEADS_LIST_LIMIT_ENV_KEY = 'VACANCY_LEADS_LIST_LIMIT';

/**
 * §4.11.9/§5.7: статус прогона поиска, живущий в памяти процесса (VacancyScanStateService).
 * IDLE — прогонов после старта процесса не было (рестарт возвращает сюда же).
 */
export const SCAN_STATUS = {
  IDLE: 'IDLE',
  RUNNING: 'RUNNING',
  DONE: 'DONE',
  ERROR: 'ERROR',
} as const;

/** §4.11.11: причина остановки прогона. STOPPED — кооперативная остановка по запросу пользователя (§4.11.12). */
export const SCAN_STOPPED_REASON = {
  COMPLETED: 'COMPLETED',
  LAST_PAGE: 'LAST_PAGE',
  MAX_PAGES: 'MAX_PAGES',
  MAX_DETAILS: 'MAX_DETAILS',
  DEADLINE: 'DEADLINE',
  AGE_LIMIT: 'AGE_LIMIT',
  STOPPED: 'STOPPED',
  ERROR: 'ERROR',
} as const;

/**
 * §4.11.12: причины, при которых выдача исчерпана целиком (или намеренно обрублена
 * возрастной отсечкой) — позиция прогона в этих случаях очищается (следующий
 * запуск начнётся с страницы 0), а не сохраняется. Остальные причины (STOPPED,
 * DEADLINE, MAX_DETAILS, ERROR) сохраняют позицию — прогон оборвался, не дойдя
 * до конца выдачи.
 */
export const SCAN_EXHAUSTED_STOPPED_REASONS = [
  SCAN_STOPPED_REASON.COMPLETED,
  SCAN_STOPPED_REASON.LAST_PAGE,
  SCAN_STOPPED_REASON.MAX_PAGES,
  SCAN_STOPPED_REASON.AGE_LIMIT,
] as const;

/**
 * §4.11.2: детали страницы (стадия 3–4) теперь идут пулом mapWithConcurrency, а не
 * последовательным циклом — здесь ставить второй, скрытый троттл не нужно: троттл
 * конкретного источника (VacancyRequestThrottle) уже разносит запросы к hh.ru по
 * времени, а у Ollama лимита частоты нет вовсе. 0 — намеренное значение, а не
 * временный дефолт.
 */
export const VACANCY_SCAN_AI_MIN_START_DELAY_MS = 0;

/**
 * §4.11.12: порядок, в котором сегодняшний последовательный цикл проверяет условия
 * для ОДНОГО кандидата (см. planPageWork в vacancy-scan.service.ts) — resolvePageStop
 * (vacancy-scan-stop.helpers.ts) воспроизводит его для набора причин, собранных с
 * конкурентных воркеров пула деталей, чтобы прогон, который раньше упёрся бы сразу в
 * два условия, отдавал ту же причину, что и раньше. Все три причины сохраняют позицию
 * возобновления (§4.11.12) одинаково — порядок влияет только на отображаемый
 * stoppedReason, никогда на возобновляемость.
 */
export const SCAN_PAGE_STOP_PRECEDENCE: readonly ScanStoppedReason[] = [
  SCAN_STOPPED_REASON.STOPPED,
  SCAN_STOPPED_REASON.DEADLINE,
  SCAN_STOPPED_REASON.MAX_DETAILS,
];

/** §4.11.12: режим старта прогона — с нуля либо с сохранённой позиции. */
export const SCAN_MODES = ['FRESH', 'RESUME'] as const;
export const DEFAULT_SCAN_MODE = SCAN_MODES[0];

/**
 * §5.7: источник, с которым идёт прогон, если тело POST /scan его не назвало —
 * ровно та же схема совместимости, что у DEFAULT_SCAN_MODE. Допустимые значения
 * перечисляет VACANCY_LEAD_SEARCH_SOURCES (vacancies/vacancies.constants.ts):
 * поиск лидов поддерживают не все источники синхронизации.
 */
export const DEFAULT_SCAN_SOURCE = VACANCY_SOURCE.HH;

/**
 * §3.7: таблица сохранённых позиций прогона — по строке на источник поиска (PK по
 * source), а не единственная строка: прогон идёт по одному источнику за раз, но
 * «Продолжить» предлагается для каждого источника отдельно. Своя таблица и свой
 * сервис (VacancyScanPositionService), а не поле в vacancy_search_settings: это
 * машинная позиция, а не пользовательская настройка (см. обоснование в blueprint
 * §3, «Chosen approach»).
 */
export const VACANCY_SCAN_POSITION_TABLE = 'vacancy_scan_position';

/** Свойство сущности VacancyScanPosition → имя колонки в БД. */
export const VACANCY_SCAN_POSITION_COLUMN = {
  SOURCE: 'source',
  NEXT_PAGE: 'next_page',
  SEARCH_URL_TEMPLATE: 'search_url_template',
  UPDATED_AT: 'updated_at',
} as const;

/** По определению совпадает с шириной vacancy_search_settings.search_url_template — колонка хранит её копию. */
export const VACANCY_SCAN_POSITION_SEARCH_URL_TEMPLATE_LENGTH =
  VACANCY_SEARCH_SETTINGS_SEARCH_URL_TEMPLATE_LENGTH;

export const VACANCY_SCAN_INITIAL_PAGE = 0;

/**
 * §3.7: строку засевает миграция CreateVacancyScanPositionTable — сервис её не
 * создаёт, тот же принцип, что у vacancy_search_settings.
 */
export const VACANCY_SCAN_POSITION_MISSING_MESSAGE =
  'Позиция прогона поиска не найдена: миграция не выполнена или строка удалена вручную';
export const VACANCY_SCAN_POSITION_SAVE_FAILED_MESSAGE =
  'Не удалось сохранить позицию прогона поиска';

/** §4.11: источник запрошен, но провайдера поиска для него нет — рассинхронизация реестра, не плохой запрос. */
export const VACANCY_LEAD_SEARCH_PROVIDER_MISSING_MESSAGE =
  'Поиск лидов для этого источника не поддерживается';

/** §8: имена env-переменных бюджетов и режимов прогона (значения — в config/config.constants.ts). */
export const VACANCY_SCAN_MAX_PAGES_ENV_KEY = 'VACANCY_SCAN_MAX_PAGES';
export const VACANCY_SCAN_MAX_DETAILS_ENV_KEY = 'VACANCY_SCAN_MAX_DETAILS';
export const VACANCY_SCAN_MAX_AGE_DAYS_ENV_KEY = 'VACANCY_SCAN_MAX_AGE_DAYS';
export const VACANCY_SCAN_MAX_DURATION_MS_ENV_KEY = 'VACANCY_SCAN_MAX_DURATION_MS';
export const VACANCY_PREFILTER_MODE_ENV_KEY = 'VACANCY_PREFILTER_MODE';
export const VACANCY_MATCH_MODE_ENV_KEY = 'VACANCY_MATCH_MODE';

export const VACANCY_SCAN_ALREADY_RUNNING_MESSAGE = 'Прогон поиска вакансий уже выполняется';
export const VACANCY_SCAN_FINISHED_MESSAGE = 'Прогон поиска вакансий завершён';
export const VACANCY_SCAN_UNEXPECTED_ERROR_MESSAGE =
  'Непредвиденная ошибка прогона поиска вакансий';
export const VACANCY_SCAN_NOT_RUNNING_MESSAGE = 'Прогон поиска вакансий не выполняется';
export const VACANCY_SCAN_NO_RESUME_POSITION_MESSAGE =
  'Сохранённой позиции прогона нет или она устарела: ссылка на выдачу изменилась';
export const VACANCY_SCAN_STOP_REQUESTED_MESSAGE = 'Запрошена остановка прогона поиска вакансий';

/**
 * §4.12.4: предупреждение при старте, если ai_enabled = true, а модели нет
 * у провайдера (VacancyAiCheckService). Старт процесса это не роняет.
 */
export const VACANCY_AI_MODEL_UNAVAILABLE_MESSAGE =
  'Модель ИИ недоступна у провайдера: прогон поиска будет работать по ключевым словам';
export const VACANCY_AI_CHECK_FAILED_MESSAGE = 'Проверка доступности модели ИИ не выполнена';
