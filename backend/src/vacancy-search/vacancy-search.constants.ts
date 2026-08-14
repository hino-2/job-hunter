/**
 * Все литералы модуля vacancy-search: имена таблиц/колонок/индексов обеих таблиц
 * (§3.5, §3.6), ширины колонок, значения match_source (§4.12) — по тому же правилу,
 * что и applications.constants.ts (единственный источник snake_case-имён для своих
 * таблиц). Enum match_source объявлен как `as const`-объект по той же причине, что
 * SYNC_OUTCOME/VACANCY_SOURCE в applications.constants.ts (§10 пп.3–4).
 */

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
  SEARCH_TEXT: 'search_text',
  KEYWORDS: 'keywords',
  EXCLUDE_KEYWORDS: 'exclude_keywords',
  TITLE_PROMPT: 'title_prompt',
  DESCRIPTION_PROMPT: 'description_prompt',
  AI_ENABLED: 'ai_enabled',
  UPDATED_AT: 'updated_at',
} as const;

/** §3.6: таблица — ровно одна строка, CHECK (id = 1). */
export const VACANCY_SEARCH_SETTINGS_SINGLETON_ID = 1;

export const VACANCY_SEARCH_SETTINGS_ID_CHECK = 'CHK_vacancy_search_settings_id';

export const VACANCY_SEARCH_SETTINGS_SEARCH_TEXT_LENGTH = 512;

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
