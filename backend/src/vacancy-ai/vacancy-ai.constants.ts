import type { AiJsonSchema } from './vacancy-ai.interfaces';

/**
 * Все литералы модуля vacancy-ai: env-ключи, DI-токен адаптера, пути и поля обоих
 * протоколов (Ollama/OpenAI), JSON Schema вердиктов (§4.12.3), плейсхолдеры промптов
 * (§4.12.2) и тексты сообщений. Значения env (дефолты, границы) — уже в
 * config/config.constants.ts (шаг B1); здесь только ИМЕНА переменных, как в
 * hh.constants.ts (HH_SITE_BASE_URL_ENV_KEY и т.п.).
 */

export const VACANCY_AI_PROVIDER_ENV_KEY = 'VACANCY_AI_PROVIDER';
export const VACANCY_AI_BASE_URL_ENV_KEY = 'VACANCY_AI_BASE_URL';
export const VACANCY_AI_MODEL_ENV_KEY = 'VACANCY_AI_MODEL';
export const VACANCY_AI_API_KEY_ENV_KEY = 'VACANCY_AI_API_KEY';
export const VACANCY_AI_BATCH_SIZE_ENV_KEY = 'VACANCY_AI_BATCH_SIZE';
export const VACANCY_AI_TIMEOUT_MS_ENV_KEY = 'VACANCY_AI_TIMEOUT_MS';
export const VACANCY_AI_DESCRIPTION_MAX_CHARS_ENV_KEY = 'VACANCY_AI_DESCRIPTION_MAX_CHARS';

/** §4.12.1: два протокола общения с моделью — переключение через VACANCY_AI_PROVIDER. */
export const VACANCY_AI_PROVIDER = {
  OLLAMA: 'ollama',
  OPENAI: 'openai',
} as const;

/** DI-токен адаптера, собранного vacancy-ai.provider.factory.ts по VACANCY_AI_PROVIDER. */
export const VACANCY_AI_PROVIDER_TOKEN = Symbol('VACANCY_AI_PROVIDER');

/** §4.12.3: воспроизводимость важнее творчества — одно и то же значение у обоих провайдеров. */
export const VACANCY_AI_TEMPERATURE = 0;

/**
 * Гибридные модели Qwen3 без суффикса -instruct (например, qwen3:1.7b) по умолчанию
 * генерируют блок <think>…</think> перед ответом — без явного отключения отбор тихо
 * замедляется в разы, ошибки при этом нет. Проверено на живом Ollama (qwen3:1.7b —
 * think:false реально отключает размышление и ускоряет ответ в разы; qwen3:4b-instruct
 * принимает поле без ошибки «model does not support thinking»), поэтому передаётся
 * безусловно — опасение из code-review не подтвердилось.
 */
export const VACANCY_AI_THINK = false;

export const VACANCY_AI_CHAT_ROLE_USER = 'user';

/** §4.12.3: Ollama принимает JSON Schema в поле format при POST /api/chat. */
export const OLLAMA_CHAT_PATH = '/api/chat';
/** §4.12.4: проверка доступности модели при старте (VacancyAiCheckService). */
export const OLLAMA_TAGS_PATH = '/api/tags';
export const OLLAMA_MESSAGE_FIELD = 'message';
export const OLLAMA_MESSAGE_CONTENT_FIELD = 'content';
export const OLLAMA_TAGS_MODELS_FIELD = 'models';
export const OLLAMA_MODEL_NAME_FIELD = 'name';

/** §4.12.3: OpenAI-совместимые API — response_format вместо format, ключ авторизации в заголовке. */
export const OPENAI_CHAT_COMPLETIONS_PATH = '/v1/chat/completions';
export const OPENAI_MODELS_PATH = '/v1/models';
export const OPENAI_RESPONSE_FORMAT_TYPE = 'json_schema';
export const OPENAI_AUTHORIZATION_HEADER = 'Authorization';
export const OPENAI_BEARER_PREFIX = 'Bearer ';
export const OPENAI_CHOICES_FIELD = 'choices';
export const OPENAI_MESSAGE_FIELD = 'message';
export const OPENAI_MESSAGE_CONTENT_FIELD = 'content';
export const OPENAI_MODELS_DATA_FIELD = 'data';
export const OPENAI_MODEL_ID_FIELD = 'id';

/** §4.12.2: плейсхолдеры промптов — {titles} и {company} допустимы только там, где есть смысл (см. helpers). */
export const VACANCY_AI_KEYWORDS_PLACEHOLDER = '{keywords}';
export const VACANCY_AI_TITLES_PLACEHOLDER = '{titles}';
export const VACANCY_AI_TITLE_PLACEHOLDER = '{title}';
export const VACANCY_AI_COMPANY_PLACEHOLDER = '{company}';
export const VACANCY_AI_DESCRIPTION_PLACEHOLDER = '{description}';

export const VACANCY_AI_KEYWORDS_JOIN_SEPARATOR = ', ';
/** §4.12.2: «N. <название> — <компания>», нумерация с 1 (formatTitlesBlock). */
export const VACANCY_AI_TITLES_LINE_SEPARATOR = '\n';
export const VACANCY_AI_TITLE_LINE_DIVIDER = ' — ';

/** §4.12.3: массив по одному объекту на название, объект — на этапе описания. */
export const VACANCY_AI_VERDICTS_FIELD = 'verdicts';
export const VACANCY_AI_VERDICT_FIELD = {
  INDEX: 'index',
  MATCHES: 'matches',
  REASON: 'reason',
  EVIDENCE: 'evidence',
} as const;

/**
 * §4.12.3: схема оборачивает массив вердиктов в объект { verdicts: [...] } — root-схема
 * OpenAI structured outputs обязана быть объектом, а не массивом. parseTitleVerdicts
 * (vacancy-ai.parsers.ts) на входе принимает и голый массив, и эту обёртку — Ollama
 * не требует root-объект, но единая схема проще, чем две разных под провайдера.
 */
export const VACANCY_AI_TITLE_JSON_SCHEMA: AiJsonSchema = {
  name: 'title_verdicts',
  schema: {
    type: 'object',
    properties: {
      [VACANCY_AI_VERDICTS_FIELD]: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            [VACANCY_AI_VERDICT_FIELD.INDEX]: { type: 'integer' },
            [VACANCY_AI_VERDICT_FIELD.MATCHES]: { type: 'boolean' },
            [VACANCY_AI_VERDICT_FIELD.REASON]: { type: 'string' },
          },
          required: [
            VACANCY_AI_VERDICT_FIELD.INDEX,
            VACANCY_AI_VERDICT_FIELD.MATCHES,
            VACANCY_AI_VERDICT_FIELD.REASON,
          ],
          additionalProperties: false,
        },
      },
    },
    required: [VACANCY_AI_VERDICTS_FIELD],
    additionalProperties: false,
  },
};

/**
 * §4.12.3: схема этапа 4 — один объект { matches, reason, evidence }. evidence — то,
 * что провоцировало галлюцинацию модели («Node.js (в названии вакансии)…» — реального
 * совпадения в описании не было): требуем дословную цитату отдельным полем, чтобы
 * vacancy-ai.service.ts мог проверить её вхождение в реальный текст описания
 * (isEvidenceGrounded, vacancy-ai.helpers.ts) до того, как reason уйдёт в БД.
 */
export const VACANCY_AI_DESCRIPTION_JSON_SCHEMA: AiJsonSchema = {
  name: 'description_verdict',
  schema: {
    type: 'object',
    properties: {
      [VACANCY_AI_VERDICT_FIELD.MATCHES]: { type: 'boolean' },
      [VACANCY_AI_VERDICT_FIELD.REASON]: { type: 'string' },
      [VACANCY_AI_VERDICT_FIELD.EVIDENCE]: { type: 'string' },
    },
    required: [
      VACANCY_AI_VERDICT_FIELD.MATCHES,
      VACANCY_AI_VERDICT_FIELD.REASON,
      VACANCY_AI_VERDICT_FIELD.EVIDENCE,
    ],
    additionalProperties: false,
  },
};

export const VACANCY_AI_INVALID_RESPONSE_MESSAGE = 'Модель вернула невалидный ответ';
export const VACANCY_AI_UNEXPECTED_STATUS_MESSAGE = 'Провайдер ИИ ответил статусом';
export const VACANCY_AI_TRANSPORT_ERROR_MESSAGE = 'Запрос к провайдеру ИИ не выполнен';
export const VACANCY_AI_MISSING_CONTENT_MESSAGE = 'В ответе провайдера ИИ нет текста сообщения';
export const VACANCY_AI_MODELS_LIST_FAILED_MESSAGE =
  'Не удалось получить список моделей у провайдера ИИ';

/**
 * §4.12.3: нормализация evidence и description ПЕРЕД сравнением подстрокой
 * (isEvidenceGrounded, vacancy-ai.helpers.ts) — таблица применяется к ОБЕИМ сторонам
 * сравнения одинаково, это и делает каждую подстановку безопасной (не нужно гадать,
 * какая сторона «канонична»). Порядок важен, схлопывание пробельных серий — обязательно
 * последний шаг: класс пробельных символов регулярного выражения в JS уже покрывает
 * неразрывные пробелы (U+00A0, U+202F) и BOM (U+FEFF), отдельное правило для них не нужно.
 *
 * По той же причине, что normalizeText в vacancy-search/vacancy-keywords.helpers.ts не
 * реэкспортируется сюда: модуль vacancy-ai не должен зависеть от vacancy-search
 * (обратная зависимость конвейера отбора), правило ё → е продублировано локально.
 */
export const VACANCY_AI_EVIDENCE_NORMALIZATION_REPLACEMENTS: ReadonlyArray<
  readonly [RegExp, string]
> = [
  [/[«»„“”‘’'`]/g, '"'],
  [/[–—‒−]/g, '-'],
  [/…/g, '...'],
  [/ё/g, 'е'],
  [/\s+/g, ' '],
];

/**
 * §4.12.3: убивает вырожденные цитаты («», «.», «-»), которые тривиально совпали бы
 * подстрокой почти с любым описанием. Порог намеренно низкий — легитимный короткий
 * токен профиля («node.js», «java») не должен превращаться в фолбэк.
 */
export const VACANCY_AI_EVIDENCE_MIN_NORMALIZED_LENGTH = 3;

/** §4.12.3: полная цитата в лог не идёт — только обрезанный фрагмент (та же причина, что у description). */
export const VACANCY_AI_EVIDENCE_LOG_MAX_CHARS = 120;

export const VACANCY_AI_EVIDENCE_UNGROUNDED_MESSAGE =
  'Цитата модели не найдена в описании вакансии';
