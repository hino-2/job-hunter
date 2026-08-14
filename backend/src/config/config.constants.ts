import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Значения по умолчанию и допустимые варианты для переменных окружения.
 * Обязательные переменные (креды БД, AUTH_*) дефолтов не имеют намеренно —
 * их отсутствие должно ронять приложение на старте.
 */
export const ENV_FILE_PATHS = ['../.env', '.env'];

export const NODE_ENVS = ['development', 'production', 'test'] as const;

export const LOG_LEVELS = ['verbose', 'debug', 'log', 'warn', 'error', 'fatal'] as const;

export const TCP_PORT_MIN = 1;
export const TCP_PORT_MAX = 65535;

export const DEFAULT_NODE_ENV = 'development';
export const DEFAULT_LOG_LEVEL = 'log';
export const DEFAULT_API_PORT = 3000;
export const DEFAULT_WEB_PORT = 8080;
export const DEFAULT_DATABASE_PORT = 5432;

export const DEFAULT_HH_SITE_BASE_URL = 'https://hh.ru';
export const DEFAULT_HH_REQUEST_TIMEOUT_MS = 10_000;
export const DEFAULT_HH_MAX_RETRIES = 2;

/**
 * §4.9. Разведка не обнаружила у getmatch.ru отдельных требований к User-Agent
 * (403 не наблюдался с обычным браузерным заголовком), поэтому в отличие от
 * HH_USER_AGENT (обязателен, дефолта нет) у getmatch есть безопасный дефолт.
 */
export const DEFAULT_GETMATCH_SITE_BASE_URL = 'https://getmatch.ru';
export const DEFAULT_GETMATCH_USER_AGENT = 'job-hunter/1.0';
export const DEFAULT_GETMATCH_REQUEST_TIMEOUT_MS = 10_000;
export const DEFAULT_GETMATCH_MAX_RETRIES = 2;

/** Общий параметр массового прогона (§4.6): один прогон может смешивать источники. */
export const DEFAULT_SYNC_CONCURRENCY = 3;
export const DEFAULT_SYNC_MIN_DELAY_MS = 200;

/**
 * §4.10. Каталог логотипов эфемерный (tmpdir, без docker-volume) — после
 * пересоздания контейнера файлы теряются, а колонка company_logo_file самолечится
 * ближайшей синхронизацией.
 */
export const COMPANY_LOGO_DIR_NAME = 'job-hunter-logos';
export const DEFAULT_COMPANY_LOGO_DIR = join(tmpdir(), COMPANY_LOGO_DIR_NAME);
export const DEFAULT_COMPANY_LOGO_REQUEST_TIMEOUT_MS = 5_000;

/**
 * Границы валидации таймаута и числа ретраев — общие для всех источников вакансий:
 * их значения проверяют и HH_REQUEST_TIMEOUT_MS/HH_MAX_RETRIES, и
 * GETMATCH_REQUEST_TIMEOUT_MS/GETMATCH_MAX_RETRIES (без префикса HH_, потому что
 * смысл границы не привязан к конкретному источнику).
 */
export const REQUEST_TIMEOUT_MIN_MS = 1_000;
export const REQUEST_TIMEOUT_MAX_MS = 60_000;
export const MAX_RETRIES_MAX = 10;
export const SYNC_CONCURRENCY_MAX = 10;
export const SYNC_MIN_DELAY_MAX_MS = 10_000;

/** §4.7. Плановая синхронизация: включена, раз в 30 минут. */
export const DEFAULT_SCHEDULED_SYNC_ENABLED = 'true';
export const DEFAULT_SCHEDULED_SYNC_INTERVAL_MS = 1_800_000;

/**
 * Булева env-переменная приходит строкой, поэтому валидируется как перечисление:
 * @Type(() => Boolean) превратил бы 'false' в true (Boolean('false') === true),
 * то есть выключить планировщик стало бы невозможно.
 */
export const BOOLEAN_ENV_VALUES = ['true', 'false'] as const;
export const TRUE_ENV_VALUE = 'true';

/**
 * Нижняя граница интервала — защита источников: чаще раза в минуту приложение
 * превратилось бы в постоянную нагрузку на hh.ru/getmatch.ru. Верхняя (24 часа) —
 * ещё и защита от опечатки: setInterval в Node принимает не более 2^31-1 мс
 * (~24.8 суток) и молча вырождает большее значение в 1 мс.
 */
export const SCHEDULED_SYNC_INTERVAL_MIN_MS = 60_000;
export const SCHEDULED_SYNC_INTERVAL_MAX_MS = 86_400_000;

/**
 * §4.11.2. Общий троттл всех запросов к hh.ru (HhRequestThrottle, модуль hh/):
 * минимальный интервал между стартами запросов = 1000 / HH_MAX_REQUESTS_PER_SECOND.
 *
 * Нижняя граница — защита от деления на ноль и отрицательного интервала в
 * HhRequestThrottle. Верхняя (50) проверяется наравне с ней: значение выше — это уже
 * не «поиск не должен подозрительно нагружать hh.ru», а отсутствие троттла, и попасть
 * туда опечаткой в .env нельзя. E2e укладывается в тот же потолок: заглушка локальная,
 * и 50 запросов в секунду (интервал 20 мс) не удлиняют прогон заметно.
 */
export const DEFAULT_HH_MAX_REQUESTS_PER_SECOND = 2;
export const HH_MAX_REQUESTS_PER_SECOND_MIN = 0.1;
export const HH_MAX_REQUESTS_PER_SECOND_MAX = 50;

/**
 * §4.11.1. Дефолтный шаблон выдачи hh.ru — сортировка по свежести публикации
 * (на ней держится ранняя остановка по возрасту, §4.11.6) плюс явные фильтры,
 * повторяющие анонимно подборку «под резюме» (cookie-сессия отклонена пользователем,
 * см. §4.11.1). Региональный хост (ekaterinburg) не важен — вакансия одна и та же
 * для всех региональных доменов, а в vacancy_url всё равно пишется канонический адрес.
 */
export const DEFAULT_HH_SEARCH_URL_TEMPLATE =
  'https://ekaterinburg.hh.ru/search/vacancy?text={text}&salary=&ored_clusters=true' +
  '&work_schedule_by_days=FIVE_ON_TWO_OFF&order_by=publication_time&page={page}';

/**
 * Оба плейсхолдера обязательны (§4.11.1): без {page} прогон читал бы первую страницу
 * бесконечно. Проверка через .test() — совпадение в любом месте строки, а не
 * полное совпадение шаблона целиком.
 */
export const HH_SEARCH_URL_TEXT_PLACEHOLDER_PATTERN = /\{text\}/;
export const HH_SEARCH_URL_PAGE_PLACEHOLDER_PATTERN = /\{page\}/;

export const HH_SEARCH_URL_MISSING_TEXT_PLACEHOLDER_MESSAGE =
  'HH_SEARCH_URL_TEMPLATE обязан содержать плейсхолдер {text}';
export const HH_SEARCH_URL_MISSING_PAGE_PLACEHOLDER_MESSAGE =
  'HH_SEARCH_URL_TEMPLATE обязан содержать плейсхолдер {page}, иначе прогон читал бы' +
  ' первую страницу бесконечно';

/** §4.11.8: бюджеты одного прогона поиска. */
export const DEFAULT_VACANCY_SCAN_MAX_PAGES = 10;
export const VACANCY_SCAN_MAX_PAGES_MIN = 1;
/** У hh.ru своя отсечка на 40-й странице (paging.lastPage.page = 39, §4.11.1). */
export const VACANCY_SCAN_MAX_PAGES_MAX = 40;

export const DEFAULT_VACANCY_SCAN_MAX_DETAILS = 30;
export const DEFAULT_VACANCY_SCAN_MAX_AGE_DAYS = 30;
export const DEFAULT_VACANCY_SCAN_MAX_DURATION_MS = 1_800_000;

/** §4.11.4: режим детерминированного отбора до/вместо ИИ. */
export const VACANCY_PREFILTER_MODES = ['exclude_only', 'full', 'off'] as const;
export const DEFAULT_VACANCY_PREFILTER_MODE = 'exclude_only';

export const VACANCY_MATCH_MODES = ['any', 'all'] as const;
export const DEFAULT_VACANCY_MATCH_MODE = 'any';

/** §5.7: предохранитель, а не пагинация. */
export const DEFAULT_VACANCY_LEADS_LIST_LIMIT = 500;

/** §4.12.1: протокол общения с моделью — либо Ollama, либо OpenAI-совместимый API. */
export const VACANCY_AI_PROVIDERS = ['ollama', 'openai'] as const;
export const DEFAULT_VACANCY_AI_PROVIDER = 'ollama';
export const DEFAULT_VACANCY_AI_BASE_URL = 'http://ollama:11434';
export const DEFAULT_VACANCY_AI_MODEL = 'qwen3:4b-instruct';
export const DEFAULT_VACANCY_AI_BATCH_SIZE = 10;
export const DEFAULT_VACANCY_AI_TIMEOUT_MS = 120_000;
export const DEFAULT_VACANCY_AI_DESCRIPTION_MAX_CHARS = 6_000;
