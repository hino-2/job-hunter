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

/**
 * §4.8/§4.11: третий источник. Как и у getmatch.ru, требований к конкретному
 * User-Agent разведка не обнаружила — поэтому все пять ключей опциональны с
 * безопасными дефолтами, в отличие от обязательного HH_USER_AGENT.
 */
export const DEFAULT_IT_VACANCIES_SITE_BASE_URL = 'https://it-vacancies.ru';
export const DEFAULT_IT_VACANCIES_USER_AGENT = 'job-hunter/1.0';
export const DEFAULT_IT_VACANCIES_REQUEST_TIMEOUT_MS = 10_000;
export const DEFAULT_IT_VACANCIES_MAX_RETRIES = 2;

/**
 * §4.11.2: свой лимит частоты, независимый от HH_MAX_REQUESTS_PER_SECOND — прогон
 * поиска по одному источнику не должен отнимать слоты у синхронизации по другому.
 * Границы диапазона переиспользуются общие (HH_MAX_REQUESTS_PER_SECOND_MIN/MAX).
 */
export const DEFAULT_IT_VACANCIES_MAX_REQUESTS_PER_SECOND = 2;

/** Общий параметр массового прогона (§4.6): один прогон может смешивать источники. */
export const DEFAULT_SYNC_CONCURRENCY = 3;
export const DEFAULT_SYNC_MIN_DELAY_MS = 200;

/**
 * §4.10. Дефолт под дев-режим, где приложение работает на хосте: в Docker
 * COMPANY_LOGO_DIR указывает на именованный том logos, потому что /tmp контейнера
 * пропадает при каждом пересоздании вместе со всеми скачанными логотипами.
 */
export const COMPANY_LOGO_DIR_NAME = 'job-hunter-logos';
export const DEFAULT_COMPANY_LOGO_DIR = join(tmpdir(), COMPANY_LOGO_DIR_NAME);
export const DEFAULT_COMPANY_LOGO_REQUEST_TIMEOUT_MS = 5_000;

/**
 * Границы валидации таймаута и числа ретраев — общие для всех источников вакансий:
 * их значения проверяют HH_REQUEST_TIMEOUT_MS/HH_MAX_RETRIES,
 * GETMATCH_REQUEST_TIMEOUT_MS/GETMATCH_MAX_RETRIES и
 * IT_VACANCIES_REQUEST_TIMEOUT_MS/IT_VACANCIES_MAX_RETRIES (без префикса источника,
 * потому что смысл границы не привязан к конкретному источнику).
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
 * Границы диапазона общие для всех источников с троттлом (их же проверяет
 * IT_VACANCIES_MAX_REQUESTS_PER_SECOND): смысл границы от источника не зависит,
 * а исторический префикс HH_ сохранён, чтобы не переименовывать переменную .env.
 *
 * Нижняя граница — защита от деления на ноль и отрицательного интервала в
 * VacancyRequestThrottle. Верхняя (50) проверяется наравне с ней: значение выше — это уже
 * не «поиск не должен подозрительно нагружать hh.ru», а отсутствие троттла, и попасть
 * туда опечаткой в .env нельзя. E2e укладывается в тот же потолок: заглушка локальная,
 * и 50 запросов в секунду (интервал 20 мс) не удлиняют прогон заметно.
 */
export const DEFAULT_HH_MAX_REQUESTS_PER_SECOND = 2;
export const HH_MAX_REQUESTS_PER_SECOND_MIN = 0.1;
export const HH_MAX_REQUESTS_PER_SECOND_MAX = 50;

/**
 * §4.11.8: бюджеты одного прогона поиска. Дефолт 40 совпадает с собственным
 * потолком hh.ru (paging.lastPage.page = 39, §4.11.1) — прогон по умолчанию
 * вычерпывает всю доступную выдачу, MAX_PAGES и LAST_PAGE на полном прогоне
 * теперь совпадают.
 */
export const DEFAULT_VACANCY_SCAN_MAX_PAGES = 40;
export const VACANCY_SCAN_MAX_PAGES_MIN = 1;
/** У hh.ru своя отсечка на 40-й странице (paging.lastPage.page = 39, §4.11.1). */
export const VACANCY_SCAN_MAX_PAGES_MAX = 40;

/**
 * Бюджет открытия страниц вакансий рассчитан на полный прогон по 40 страницам:
 * на первом прогоне до ИИ по описанию доходят сотни позиций, а прежние 60 обрывали
 * его на шестой-седьмой странице. На повторных прогонах бюджет почти не расходуется —
 * известные вакансии отсеиваются дедупликацией до всякого ИИ (§4.11.5).
 */
export const DEFAULT_VACANCY_SCAN_MAX_DETAILS = 600;
export const DEFAULT_VACANCY_SCAN_MAX_AGE_DAYS = 30;
/**
 * Дедлайн прогона — 4 часа. Замер на живой выдаче: 6 страниц за 30 минут, то есть
 * все 40 страниц требуют около 3.5 часов, и прежние 30 минут гарантированно обрывали
 * прогон задолго до конца. Дедлайн держится не на hh.ru (её запросы при 2 rps дают
 * ≈20 с на прогон), а на времени ответа модели. Страховка от зависшего прогона теперь
 * не только здесь: §4.11.12 даёт ручную остановку.
 */
export const DEFAULT_VACANCY_SCAN_MAX_DURATION_MS = 14_400_000;

/** §4.11.4: режим детерминированного отбора до/вместо ИИ. */
export const VACANCY_PREFILTER_MODES = ['exclude_only', 'full', 'off'] as const;
export const DEFAULT_VACANCY_PREFILTER_MODE = 'exclude_only';

export const VACANCY_MATCH_MODES = ['any', 'all'] as const;
export const DEFAULT_VACANCY_MATCH_MODE = 'any';

/** §5.7: предохранитель, а не пагинация. */
export const DEFAULT_VACANCY_LEADS_LIST_LIMIT = 3000;

/** §4.12.1: протокол общения с моделью — либо Ollama, либо OpenAI-совместимый API. */
export const VACANCY_AI_PROVIDERS = ['ollama', 'openai'] as const;
export const DEFAULT_VACANCY_AI_PROVIDER = 'ollama';
export const DEFAULT_VACANCY_AI_BASE_URL = 'http://ollama:11434';
export const DEFAULT_VACANCY_AI_MODEL = 'qwen3:4b-instruct';

/**
 * §4.12.3: границы измерены на живом Ollama (qwen3:4b-instruct) — другая модель имеет
 * свой токенизатор, и числа сдвинутся. Замер настоящего title_prompt из
 * vacancy_search_settings с реалистичным блоком названий: 20 названий ≈ 815
 * промпт-токенов, 50 ≈ 1439, 60 ≈ 1617 (~415 токенов на неизменную часть промпта +
 * ~20 токенов на каждое название).
 *
 * При батче VACANCY_AI_BATCH_SIZE_MAX промпт (~415 + 20 × batch) и потолок вывода
 * (resolveTitleMaxOutputTokens, vacancy-ai.helpers.ts) обязаны вместе укладываться в
 * n_ctx = 4096 с запасом не менее 15% — иначе llama.cpp молча обрезает/сдвигает
 * переполненный контекст вместо ошибки, и единственным симптомом будет несовпадение
 * длины массива вердиктов с батчем (тихий фолбэк на ключевые слова), а не видимый
 * сбой. При batch = 30: промпт ≈ 415 + 20 × 30 = 1015, потолок вывода = 16 + 72 × 30 =
 * 2176 (VACANCY_AI_TITLE_OUTPUT_TOKENS_OVERHEAD/PER_ITEM, vacancy-ai.constants.ts) —
 * вместе 3191 из 4096, запас 22%. Прогон с реальными названиями и намеренно
 * многословными вердиктами подтвердил это на практике: 1024 промпт-токена + 1493
 * токена вывода (модель остановилась сама, до потолка). При batch = 50 потолок вывода
 * один (16 + 72 × 50 = 3616) уже занимает 88% n_ctx без учёта промпта — отсюда более
 * тесная граница, чем раньше.
 */
export const DEFAULT_VACANCY_AI_BATCH_SIZE = 20;
export const VACANCY_AI_BATCH_SIZE_MAX = 30;

/**
 * §4.12.3: замер на qwen3:4b-instruct / RTX 5070 — батч из 10 названий занимает 5–8 с,
 * один вердикт по описанию — 0.6–0.9 с. Худший реалистичный случай — первый батч из 20
 * названий против модели, только что выгруженной по OLLAMA_KEEP_ALIVE=5m (загрузка +
 * генерация). 30 000 мс покрывают это с запасом и одновременно обрезают зависший вызов
 * на 30 с вместо прежних 120 с. Один таймаут на оба этапа — сознательное решение: с
 * потолком вывода на месте генерация больше не может убежать по времени сама по себе,
 * а оставшийся класс сбоя (зависшее или стоящее в очереди соединение) от этапа не
 * зависит, так что второй env-переменной тут нечего было бы регулировать отдельно.
 *
 * Дефолт рассчитан на GPU. §4.12.4 явно поддерживает CPU-only Ollama без других
 * изменений — там и холодная загрузка модели, и сама генерация заметно медленнее, а
 * потолки вывода этапа 1/4 (VACANCY_AI_TITLE_OUTPUT_TOKENS_*,
 * VACANCY_AI_DESCRIPTION_MAX_OUTPUT_TOKENS, vacancy-ai.constants.ts) даже после
 * сужения по замерам остаются величинами в сотни и тысячи токенов — на медленном
 * железе это и есть худший случай. На CPU-only машине значение нужно поднимать
 * вручную; растущий счётчик aiFallbacks без других ошибок в логе — симптом, что
 * таймаут занижен. Сама холодная загрузка не замерялась: цифры выше сняты на
 * прогретой модели.
 */
export const DEFAULT_VACANCY_AI_TIMEOUT_MS = 30_000;

export const DEFAULT_VACANCY_AI_DESCRIPTION_MAX_CHARS = 6_000;

/**
 * §4.12.4: значение обязано совпадать с OLLAMA_NUM_PARALLEL сервиса ollama
 * (docker-compose.yml) — это два конца одного и того же ресурса, слотов модели.
 * Выше него лишние запросы не ускоряются, а просто встают в очередь внутри Ollama
 * и съедают VACANCY_AI_TIMEOUT_MS; ниже — уже оплаченные слоты KV-кеша простаивают.
 * Меняются оба значения только вместе. Не переиспользует SYNC_CONCURRENCY_MAX:
 * тот ограничивает слоты запросов к hh.ru, этот — слоты модели Ollama, разные
 * ресурсы, и совместная константа случайно связала бы их лимиты.
 */
export const DEFAULT_VACANCY_AI_CONCURRENCY = 3;
export const VACANCY_AI_CONCURRENCY_MAX = 10;
