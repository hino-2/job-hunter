import type { ScanResumeState, VacancyLeadsFilters } from '../types/vacancy-search.interfaces';
import type {
  MatchSource,
  ScanStoppedReason,
  VacancyLeadsHiddenFilter,
  VacancyLeadsOrder,
  VacancyLeadsSortField,
} from '../types/vacancy-search.type';

/**
 * Доменные константы поиска вакансий (§3.5, §3.6, §4.12, §5.7): ручная копия
 * backend/src/vacancy-search/vacancy-search.constants.ts — значения match_source,
 * фильтра hidden, полей сортировки/направления и статусов прогона. Shared-пакет
 * заводить нельзя (§3.4), поэтому enum-ы дублируются вручную, тем же приёмом, что
 * SYNC_OUTCOME/VACANCY_SOURCE в application.constants.ts.
 */

/** §4.12: кто подтвердил соответствие вакансии профилю — детерминированный отбор или ИИ. */
export const MATCH_SOURCE = {
  KEYWORDS: 'KEYWORDS',
  AI: 'AI',
} as const;

/** §5.7: значения query-параметра hidden у GET /api/vacancy-leads. */
export const VACANCY_LEADS_HIDDEN_FILTERS = ['exclude', 'only', 'all'] as const;

/**
 * §5.7: дефолт query-параметра hidden на бэкенде, когда фронт его не передаёт
 * (ручная копия DEFAULT_VACANCY_LEADS_HIDDEN_FILTER бэкенда). Нужен кэш-утилитам
 * вакансий, чтобы восстанавливать hidden-фильтр конкретного кэша по его ключу.
 */
export const DEFAULT_VACANCY_LEADS_HIDDEN_FILTER: VacancyLeadsHiddenFilter = 'exclude';

/** §5.7: допустимые значения query-параметров sort/order у GET /api/vacancy-leads. */
export const VACANCY_LEADS_SORT_FIELDS = ['publishedAt', 'firstSeenAt'] as const;
export const VACANCY_LEADS_ORDERS = ['asc', 'desc'] as const;

/**
 * §4.11.9/§5.7: статус прогона поиска, живущий в памяти процесса бэкенда.
 * IDLE — прогонов после старта процесса не было (рестарт api возвращает сюда же).
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

/** §4.11.12: режим старта прогона — с нуля («Начать поиск») либо с сохранённой позиции («Продолжить»). */
export const SCAN_MODE = {
  FRESH: 'FRESH',
  RESUME: 'RESUME',
} as const;

/** Подписи §4.12 — тот же приём, что MATCH_SOURCE_LABELS у остальных enum-ов. */
export const MATCH_SOURCE_LABELS: Record<MatchSource, string> = {
  KEYWORDS: 'по ключевым словам',
  AI: 'ИИ',
};

/** Подписи §4.11.11 для итоговой сводки прогона (§7.9.2). */
export const SCAN_STOPPED_REASON_LABELS: Record<ScanStoppedReason, string> = {
  COMPLETED: 'Поиск завершён',
  LAST_PAGE: 'Достигнута последняя страница выдачи',
  MAX_PAGES: 'Достигнут лимит страниц выдачи',
  MAX_DETAILS: 'Достигнут лимит детальных запросов',
  DEADLINE: 'Истекло отведённое время прогона',
  AGE_LIMIT: 'Вакансии дальше по выдаче старше порога',
  STOPPED: 'Прогон остановлен вручную',
  ERROR: 'Прогон прерван ошибкой',
};

/**
 * §7.9.1: experience/employmentForm/workFormats — сырой passthrough hh.ru (varchar
 * без ограничения по значениям на бэкенде, §4.11.3), а не закрытый enum. Поэтому
 * словари частичные (Partial<Record<string, string>>), а не Record<Union, string>:
 * неизвестное значение обязано остаться читаемым, а не свалить экран.
 */
export const EXPERIENCE_LABELS: Partial<Record<string, string>> = {
  noExperience: 'Без опыта',
  between1And3: '1–3 года',
  between3And6: '3–6 лет',
  moreThan6: 'Более 6 лет',
};

export const EMPLOYMENT_FORM_LABELS: Partial<Record<string, string>> = {
  FULL: 'Полная занятость',
  PART: 'Частичная занятость',
  PROJECT: 'Проектная работа',
};

export const WORK_FORMAT_LABELS: Partial<Record<string, string>> = {
  REMOTE: 'Удалённо',
  HYBRID: 'Гибрид',
  ON_SITE: 'В офисе',
};

/** §7.9.1: сортировка списка лидов, в порядке пунктов выпадающего списка. */
export const VACANCY_LEADS_SORT_LABELS: Record<VacancyLeadsSortField, string> = {
  publishedAt: 'По дате публикации',
  firstSeenAt: 'По дате обнаружения',
};

export const DEFAULT_VACANCY_LEADS_SORT: VacancyLeadsSortField = VACANCY_LEADS_SORT_FIELDS[0];
export const DEFAULT_VACANCY_LEADS_ORDER: VacancyLeadsOrder = VACANCY_LEADS_ORDERS[1];

export const DEFAULT_VACANCY_LEADS_FILTERS: VacancyLeadsFilters = {
  search: '',
  showHiddenOnly: false,
  sort: DEFAULT_VACANCY_LEADS_SORT,
  order: DEFAULT_VACANCY_LEADS_ORDER,
};

/**
 * Стабильная ссылка на пустой список (§10): литерал [] на месте использования
 * создавал бы новый массив каждый рендер и обнулял мемоизацию производных значений.
 */
export const EMPTY_VACANCY_LEADS: readonly [] = [];

export const VACANCY_LEADS_LIST_ERROR_MESSAGE = 'Не удалось загрузить список вакансий';
export const VACANCY_LEADS_RETRY_LABEL = 'Повторить';

export const VACANCY_LEADS_EMPTY_TITLE = 'Пока ничего не найдено';
export const VACANCY_LEADS_EMPTY_DESCRIPTION = 'Нажмите «Начать поиск», чтобы запустить поиск';
export const VACANCY_LEADS_EMPTY_FILTERED_TITLE = 'Ничего не найдено';
export const VACANCY_LEADS_EMPTY_FILTERED_DESCRIPTION = 'Измените фильтры или поисковый запрос';
export const VACANCY_LEADS_EMPTY_HIDDEN_TITLE = 'Скрытых вакансий нет';
export const VACANCY_LEADS_RESET_FILTERS_LABEL = 'Сбросить фильтры';

export const VACANCY_LEADS_SEARCH_PLACEHOLDER = 'Поиск…';
export const VACANCY_LEADS_HIDDEN_TOGGLE_LABEL = 'Скрытые';

export const EXPAND_VACANCY_LABEL = 'Развернуть';
export const COLLAPSE_VACANCY_LABEL = 'Свернуть';
export const HIDE_VACANCY_LABEL = 'Скрыть';
export const RESTORE_VACANCY_LABEL = 'Вернуть';
export const HIDE_VACANCY_ERROR_FALLBACK_MESSAGE = 'Не удалось скрыть вакансию';
export const RESTORE_VACANCY_ERROR_FALLBACK_MESSAGE = 'Не удалось вернуть вакансию';

/** §5.7, §7.9.1: кнопка «Отклик» — создание Application из лида, три состояния подписи. */
export const APPLY_VACANCY_LABEL = 'Отклик';
export const APPLY_VACANCY_PENDING_LABEL = 'Создаём…';
export const APPLY_VACANCY_DONE_LABEL = 'Отклик создан';
export const APPLY_VACANCY_SUCCESS_MESSAGE = 'Отклик создан';
export const APPLY_VACANCY_ALREADY_MESSAGE = 'Отклик по этой вакансии уже есть';
export const APPLY_VACANCY_ERROR_FALLBACK_MESSAGE = 'Не удалось создать отклик';

/** §7.9.1: подписи полей раскрытого состояния лида. */
export const VACANCY_LEAD_FIELD_LABELS = {
  salary: 'Зарплата',
  area: 'Регион',
  experience: 'Опыт',
  employmentForm: 'Занятость',
  workFormats: 'Формат работы',
  publishedAtFull: 'Опубликована',
  firstSeenAt: 'Впервые найдена',
  matchedKeywords: 'Совпавшие ключевые слова',
  aiTitleReason: 'ИИ по названию',
  aiDescriptionReason: 'ИИ по описанию',
} as const;

export const SALARY_GROSS_SUFFIX = ', до вычета';
export const SALARY_NET_SUFFIX = ', на руки';
export const SALARY_FROM_LABEL = 'от';
export const SALARY_TO_LABEL = 'до';
export const SALARY_VALUE_SEPARATOR = ' ';

/** §7.9.2: три кнопки прогона и их тексты по состояниям (§4.11.12). */
export const SCAN_BUTTON_LABEL = 'Начать поиск';
export const SCAN_BUTTON_PENDING_LABEL = 'Ищем…';
export const SCAN_ALREADY_RUNNING_MESSAGE = 'Поиск уже выполняется';
export const SCAN_START_ERROR_FALLBACK_MESSAGE = 'Не удалось запустить поиск';

export const SCAN_RESUME_BUTTON_LABEL = 'Продолжить';
export const SCAN_RESUME_BUTTON_PAGE_PREFIX = 'Продолжить со страницы';

export const SCAN_STOP_BUTTON_LABEL = 'Остановить';
export const SCAN_STOP_BUTTON_PENDING_LABEL = 'Останавливаем…';
export const SCAN_STOP_NOT_RUNNING_MESSAGE = 'Прогон уже завершён';
export const SCAN_STOP_ERROR_FALLBACK_MESSAGE = 'Не удалось остановить поиск';

/** §7.9.2: индикатор «страница N из M» (pageProgress, §4.11.12). */
export const SCAN_PAGE_PROGRESS_PREFIX = 'страница';
export const SCAN_PAGE_PROGRESS_SEPARATOR = ' из ';
/** currentPage приходит 0-based (совпадает с {page} шаблона ссылки на выдачу) — смещение к человеческому номеру. */
export const SCAN_PAGE_NUMBER_OFFSET = 1;
export const SCAN_PROGRESS_PERCENT_SCALE = 100;

export const SCAN_PROGRESS_PAGES_LABEL = 'страниц';
export const SCAN_PROGRESS_SEEN_LABEL = 'просмотрено';
export const SCAN_PROGRESS_CREATED_LABEL = 'найдено';
export const SCAN_PROGRESS_DUPLICATES_LABEL = 'дублей';
/** §7.9.2, пример из спецификации: «отклонено моделью: 12» — title- и description-отказы вместе. */
export const SCAN_PROGRESS_REJECTED_LABEL = 'отклонено моделью';
export const SCAN_PROGRESS_FAILED_LABEL = 'ошибок';
export const SCAN_SUMMARY_SEPARATOR = ' · ';
export const SCAN_SUMMARY_VALUE_SEPARATOR = ' ';

/**
 * §10: стабильная ссылка на «позиции для продолжения нет» — литерал на месте
 * использования (`scanStatus.data?.resume ?? { … }`) создавал бы новый объект
 * каждый рендер и пробивал memo VacancyLeadsFilterBar.
 */
export const EMPTY_SCAN_RESUME_STATE: ScanResumeState = { available: false, nextPage: null };

/** §7.9.4: кнопка настроек и заголовок диалога. */
export const SETTINGS_BUTTON_LABEL = 'Настройки поиска';
export const SETTINGS_DIALOG_TITLE = 'Настройки поиска вакансий';
export const SETTINGS_SAVE_SUCCESS_MESSAGE = 'Настройки сохранены';
export const SETTINGS_SAVE_ERROR_FALLBACK_MESSAGE = 'Не удалось сохранить настройки';
export const SETTINGS_LOAD_ERROR_MESSAGE = 'Не удалось загрузить настройки поиска';
export const RESET_PROMPT_LABEL = 'Вернуть промпт по умолчанию';

export const KEYWORDS_LABEL = 'Ключевые слова';
export const EXCLUDE_KEYWORDS_LABEL = 'Слова-исключения';
export const TITLE_PROMPT_LABEL = 'Промпт для оценки названия';
export const DESCRIPTION_PROMPT_LABEL = 'Промпт для оценки описания';
export const AI_ENABLED_LABEL = 'Использовать ИИ-отбор';
export const AI_ENABLED_DESCRIPTION =
  'При выключении работает отбор по ключевым словам, а описания вакансий не загружаются';
export const SEARCH_URL_TEMPLATE_LABEL = 'Ссылка на выдачу hh.ru';
export const SEARCH_URL_TEMPLATE_HINT =
  'Обязательный плейсхолдер: {page}. Только https и домены hh.ru';
export const RESET_SEARCH_URL_TEMPLATE_LABEL = 'Вернуть ссылку по умолчанию';

export const TITLE_PROMPT_HINT = 'Обязательные плейсхолдеры: {keywords}, {titles}';
export const DESCRIPTION_PROMPT_HINT = 'Обязательные плейсхолдеры: {keywords}, {description}';
export const KEYWORDS_HINT = 'Через запятую';

/**
 * Ограничения и правила валидации формы настроек — ручная копия
 * backend/src/vacancy-search/vacancy-search.constants.ts и dto/update-vacancy-search-settings.dto.ts
 * (§3.6, §5.7): заведомо невалидные значения на сервер не отправляются вовсе (§10),
 * поле показывает error/helperText вместо гарантированного 400.
 */
export const PROMPT_MAX_LENGTH = 8000;

/** Ручная копия VACANCY_SEARCH_SETTINGS_SEARCH_URL_TEMPLATE_LENGTH бэкенда (ширина колонки). */
export const SEARCH_URL_TEMPLATE_MAX_LENGTH = 2048;

export const PLACEHOLDER_KEYWORDS_PATTERN = /\{keywords\}/;
export const PLACEHOLDER_TITLES_PATTERN = /\{titles\}/;
export const PLACEHOLDER_DESCRIPTION_PATTERN = /\{description\}/;

/** §5.7: ручная копия HH_SEARCH_URL_PAGE_PLACEHOLDER_PATTERN бэкенда (hh/hh.constants.ts). */
export const SEARCH_URL_TEMPLATE_PAGE_PLACEHOLDER_PATTERN = /\{page\}/;

/** Ручная копия HH_SEARCH_URL_ALLOWED_PROTOCOL бэкенда (hh/hh.constants.ts). */
export const SEARCH_URL_TEMPLATE_HTTPS_PREFIX = 'https:';

/** §3.6: как в БД хранятся keywords/excludeKeywords — строка через запятую. */
export const KEYWORD_LIST_SEPARATOR = ',';
export const KEYWORD_LIST_JOIN_SEPARATOR = ', ';

export const KEYWORDS_REQUIRED_MESSAGE = 'Укажите хотя бы одно ключевое слово';
export const PROMPT_REQUIRED_MESSAGE = 'Введите текст промпта';
export const PROMPT_TOO_LONG_MESSAGE = `Не длиннее ${PROMPT_MAX_LENGTH} символов`;
export const TITLE_PROMPT_MISSING_PLACEHOLDERS_MESSAGE =
  'Промпт обязан содержать {keywords} и {titles}';
export const DESCRIPTION_PROMPT_MISSING_PLACEHOLDERS_MESSAGE =
  'Промпт обязан содержать {keywords} и {description}';

export const SEARCH_URL_TEMPLATE_REQUIRED_MESSAGE = 'Введите ссылку на выдачу';
export const SEARCH_URL_TEMPLATE_TOO_LONG_MESSAGE = `Не длиннее ${SEARCH_URL_TEMPLATE_MAX_LENGTH} символов`;
export const SEARCH_URL_TEMPLATE_MISSING_PAGE_PLACEHOLDER_MESSAGE =
  'Ссылка обязана содержать {page}';
export const SEARCH_URL_TEMPLATE_INVALID_MESSAGE = 'Нужна полная ссылка, начинающаяся с https://';

/**
 * Дефолтные значения настроек — ручная копия сидинга миграции
 * backend/src/database/migrations/1786700000001-CreateVacancySearchSettingsTable.ts,
 * нужны кнопке «Вернуть промпт по умолчанию» (§7.9.4). Текст промптов — verbatim,
 * менять только вместе с миграцией.
 */
export const DEFAULT_KEYWORDS_TEXT =
  'fullstack, full-stack, full stack, node.js, nodejs, react, typescript';
export const DEFAULT_EXCLUDE_KEYWORDS_TEXT = '1С, 1C, php, java, стажёр, стажер, junior';
export const DEFAULT_TITLE_PROMPT =
  'Ты помогаешь отбирать вакансии. Ключевые слова профиля: {keywords}.\n' +
  'Для каждого названия вакансии реши, соответствует ли оно этому профилю.\n' +
  'Учитывай синонимы и родственные технологии, а не только буквальные совпадения.\n' +
  'Отклоняй другие специальности, даже если слово из списка встретилось случайно.\n' +
  'Названия:\n{titles}\n' +
  'Ответь JSON-массивом по одному объекту на каждое название, в том же порядке.';
export const DEFAULT_DESCRIPTION_PROMPT =
  'Ты помогаешь отбирать вакансии. Ключевые слова профиля: {keywords}.\n' +
  'Вакансия: {title} в компании {company}.\n' +
  'Описание:\n{description}\n' +
  'Реши, действительно ли эта вакансия соответствует профилю: нужны ли в ней перечисленные\n' +
  'технологии как основные, а не упомянуты вскользь. Ответь JSON-объектом.';
export const DEFAULT_AI_ENABLED = false;

/**
 * Дословная копия дефолтного шаблона ссылки из миграции
 * backend/src/database/migrations/1787200000000-RemoveVacancySearchText.ts,
 * нужна кнопке «Вернуть ссылку по умолчанию» (§7.9.4). Менять только вместе с миграцией.
 */
export const DEFAULT_SEARCH_URL_TEMPLATE =
  'https://ekaterinburg.hh.ru/search/vacancy?text=fullstack&salary=&ored_clusters=true' +
  '&work_schedule_by_days=FIVE_ON_TWO_OFF&order_by=publication_time&page={page}';
