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
export const VACANCY_AI_CONCURRENCY_ENV_KEY = 'VACANCY_AI_CONCURRENCY';
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
 * §4.12.3: жёсткая граница длины reason в самой JSON Schema, а не только позже в
 * vacancy-lead.builder.ts (clampOrNull, VACANCY_LEAD_AI_REASON_LENGTH = 500,
 * vacancy-search/vacancy-search.constants.ts) — грамматика структурированного вывода
 * (GBNF у Ollama, structured outputs у OpenAI) заставляет модель закрыть строку раньше
 * и тем самым реально сократить генерацию, чего срез уже полученного текста не может.
 * Держим значение заметно меньше 500 (константа не импортируется: vacancy-ai не должен
 * знать про vacancy-search, см. комментарий выше про normalizeText) — билдер остаётся
 * последним рубежом на случай более длинного reason у другого провайдера/модели.
 *
 * Используется ТОЛЬКО схемой этапа 4 (описание) — там reason один на вакансию, и модель
 * объясняет более тонкое решение (сопоставление с реальным текстом описания, включая
 * цитату evidence), поэтому граница шире, чем у этапа 1 (см. VACANCY_AI_TITLE_REASON_MAX_LENGTH
 * ниже).
 */
export const VACANCY_AI_REASON_MAX_LENGTH = 200;

/**
 * §4.12.3: отдельная, более узкая граница reason для схемы этапа 1 (названия). На этом
 * этапе модель обосновывает только грубый отсев по названию («не разработчик»,
 * «Java-стек») — обоснование короче, чем на этапе описания. Граница важна вдвойне: одно
 * поле reason умножается на до 30 вердиктов батча (VACANCY_AI_BATCH_SIZE_MAX) под ОДНИМ
 * общим потолком генерации (resolveTitleMaxOutputTokens, vacancy-ai.helpers.ts) — растянутый
 * reason в одном вердикте отъедает потолок у всех остальных вердиктов батча.
 */
export const VACANCY_AI_TITLE_REASON_MAX_LENGTH = 100;

/**
 * §4.12.3: то же самое для evidence, но здесь длина ограничивает ещё и корректность
 * проверки isEvidenceGrounded — если грамматика заставляет модель оборвать цитату
 * раньше срока, evidence остаётся ПРЕФИКСОМ исходной дословной цитаты и поэтому
 * по-прежнему нормализованной подстрокой описания; сама проверка не меняется.
 */
export const VACANCY_AI_EVIDENCE_MAX_LENGTH = 300;

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
            [VACANCY_AI_VERDICT_FIELD.REASON]: {
              type: 'string',
              maxLength: VACANCY_AI_TITLE_REASON_MAX_LENGTH,
            },
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
      [VACANCY_AI_VERDICT_FIELD.REASON]: {
        type: 'string',
        maxLength: VACANCY_AI_REASON_MAX_LENGTH,
      },
      [VACANCY_AI_VERDICT_FIELD.EVIDENCE]: {
        type: 'string',
        maxLength: VACANCY_AI_EVIDENCE_MAX_LENGTH,
      },
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

/**
 * §4.12.3: потолок генерации этапа 4 (num_predict у Ollama, max_tokens у OpenAI). Это
 * ПОТОЛОК, а не резервирование — недогенерированные токены ничего не стоят, поэтому
 * щедрый потолок в обычном случае бесплатен, а его единственная задача — остановить
 * убежавшую генерацию. Отсюда правило: потолок обязан лежать заметно ВЫШЕ точки
 * насыщения самой схемы, иначе он режет легитимный многословный ответ раньше, чем
 * модель успевает закрыть JSON, и превращает его в тот же { ok: false } / фолбэк по
 * ключевым словам, что и настоящий сбой модели.
 *
 * Число измерено на живом Ollama (qwen3:4b-instruct — другая модель имеет свой
 * токенизатор, числа сдвинутся), а не оценено на глаз: реалистичные reason (200
 * символов) + evidence (300 символов) + структура JSON дают 163–182 токена (три
 * разных реалистичных текста), сквозной прогон с описанием, специально подобранным
 * так, чтобы вынудить модель процитировать абзац вплоть до обрезки по maxLength, дал
 * 175 токенов вывода. 280 оставляет запас ≈ 54% сверху измеренного максимума (182).
 */
export const VACANCY_AI_DESCRIPTION_MAX_OUTPUT_TOKENS = 280;

/**
 * §4.12.3: потолок этапа 1 растёт с размером батча — resolveTitleMaxOutputTokens
 * (vacancy-ai.helpers.ts). Тот же принцип, что у VACANCY_AI_DESCRIPTION_MAX_OUTPUT_TOKENS
 * (потолок, не резервирование, должен лежать выше насыщения схемы, а не вплотную к
 * ней) — и та же методология измерения на живом Ollama (qwen3:4b-instruct).
 *
 * Реалистичный reason ровно на VACANCY_AI_TITLE_REASON_MAX_LENGTH = 100 символов даёт
 * 28–39 токенов (четыре разных реалистичных текста) + структура одного элемента
 * массива без reason (`{"index":12,"matches":false,"reason":""},`) — 13 токенов →
 * худший измеренный вердикт ≈ 52 токена. PER_ITEM = 72 — запас ≈ 38% сверху этого
 * максимума, того же порядка, что у DESCRIPTION_MAX_OUTPUT_TOKENS выше. Сквозные
 * прогоны с батчами 20 и 30 названий и намеренно многословными вердиктами дали 48.7 и
 * 49.8 токена на вердикт в среднем — заметно ниже потолка, генерация останавливалась
 * сама (done_reason: stop), не по обрезке.
 *
 * OVERHEAD — обёртка `{"verdicts":[…]}` вокруг всего массива: пустой массив даёт 6
 * токенов сверх служебных токенов чат-шаблона, 16 оставляет запас на реальное
 * форматирование (Ollama возвращает вывод с отступами, а не компактным JSON).
 */
export const VACANCY_AI_TITLE_OUTPUT_TOKENS_PER_ITEM = 72;
export const VACANCY_AI_TITLE_OUTPUT_TOKENS_OVERHEAD = 16;

/**
 * §4.12.3: OpenAI structured outputs со strict: true отвечает 400 на неподдерживаемые
 * ключевые слова валидации JSON Schema внутри schema — maxLength в их число входит.
 * Список специфичен для протокола OpenAI, поэтому живёт здесь, а не в самой схеме
 * (openai-schema.helpers.ts — stripUnsupportedSchemaKeywords).
 */
export const OPENAI_STRICT_UNSUPPORTED_SCHEMA_KEYWORDS: readonly string[] = ['maxLength'];
