/**
 * Все литералы модуля applications: маршруты, имена таблицы/колонок/индексов,
 * enum-значения, лимиты длин, дефолты, whitelist'ы сортировки и куски SQL-условий.
 *
 * Enum'ы объявлены как `as const`-объекты, а не TS-`enum`: TS-`enum` — это
 * одновременно значение и тип в одном объявлении, поэтому его нельзя разложить
 * по конвенции «константы в *.constants.ts, типы в *.type.ts» (§10 пп. 3–4).
 * Производные union-типы живут в applications.type.ts.
 */

export const APPLICATIONS_ROUTE = 'applications';

export const APPLICATION_ID_PARAM = 'id';

export const APPLICATION_BY_ID_ROUTE = ':id';

/**
 * §5.2. Оба маршрута синхронизации объявляются в контроллере ВЫШЕ методов с ':id',
 * иначе Express сматчит 'sync-open' как значение параметра :id.
 */
export const APPLICATIONS_SYNC_OPEN_ROUTE = 'sync-open';

export const APPLICATION_SYNC_ROUTE = `${APPLICATION_BY_ID_ROUTE}/sync`;

/**
 * §4.10, §5.1. По тому же правилу порядка маршрутов, что и sync-роуты выше:
 * объявляется в контроллере ВЫШЕ методов с ':id', иначе Express сматчит
 * '/logo' как хвост значения :id.
 */
export const APPLICATION_LOGO_ROUTE = `${APPLICATION_BY_ID_ROUTE}/logo`;

export const APPLICATIONS_TABLE = 'applications';

export const APPLICATIONS_ALIAS = 'application';

/** Свойство сущности → имя колонки в БД. Единственный источник snake_case-имён. */
export const APPLICATION_COLUMN = {
  ID: 'id',
  COMPANY: 'company',
  POSITION: 'position',
  VACANCY_URL: 'vacancy_url',
  RESUME_URL: 'resume_url',
  INTERVIEW_URL: 'interview_url',
  STATUS: 'status',
  RESULT: 'result',
  EMPLOYER_CONTACT: 'employer_contact',
  HR_INTERVIEW_AT: 'hr_interview_at',
  TECH_INTERVIEW_AT: 'tech_interview_at',
  NOTES: 'notes',
  VACANCY_EXTERNAL_ID: 'vacancy_external_id',
  VACANCY_ARCHIVED: 'vacancy_archived',
  VACANCY_SOURCE: 'vacancy_source',
  COMPANY_LOGO_FILE: 'company_logo_file',
  LAST_SYNCED_AT: 'last_synced_at',
  LAST_SYNC_OUTCOME: 'last_sync_outcome',
  LAST_SYNC_ERROR: 'last_sync_error',
  CREATED_AT: 'created_at',
  UPDATED_AT: 'updated_at',
} as const;

/** Имена совпадают с миграцией, иначе migration:generate начнёт пересоздавать индексы. */
export const APPLICATION_INDEX = {
  STATUS: 'IDX_applications_status',
  CREATED_AT: 'IDX_applications_created_at',
} as const;

/** §3.2 */
export const APPLICATION_STATUS = {
  OPEN: 'OPEN',
  HR_INTERVIEW: 'HR_INTERVIEW',
  TECH_INTERVIEW: 'TECH_INTERVIEW',
  CLOSED: 'CLOSED',
} as const;

/**
 * §3.2: статусы, которые считаются «не завершёнными» — питают выборку sync-open,
 * фильтр «Открытые» и счётчик в шапке. CLOSED сюда не входит ни при каких условиях.
 */
export const ACTIVE_APPLICATION_STATUSES = [
  APPLICATION_STATUS.OPEN,
  APPLICATION_STATUS.HR_INTERVIEW,
  APPLICATION_STATUS.TECH_INTERVIEW,
] as const;

/** §3.3 */
export const APPLICATION_RESULT = {
  IN_PROGRESS: 'IN_PROGRESS',
  OFFER: 'OFFER',
  REJECTED_BY_COMPANY: 'REJECTED_BY_COMPANY',
  DECLINED_BY_ME: 'DECLINED_BY_ME',
  NO_RESPONSE: 'NO_RESPONSE',
  VACANCY_WITHDRAWN: 'VACANCY_WITHDRAWN',
} as const;

/**
 * §4.5. Живёт здесь, а не в модуле источников: колонка last_sync_outcome принадлежит
 * таблице applications, а зависимость по модулям идёт vacancies/hh/getmatch → applications.
 * Обратная ссылка дала бы цикл.
 */
export const SYNC_OUTCOME = {
  OK: 'OK',
  NOT_FOUND: 'NOT_FOUND',
  SKIPPED_UNSUPPORTED: 'SKIPPED_UNSUPPORTED',
  RATE_LIMITED: 'RATE_LIMITED',
  ERROR: 'ERROR',
} as const;

/**
 * §4.8. Живёт здесь по тому же правилу, что SYNC_OUTCOME: это значение колонки
 * vacancy_source таблицы applications, а не абстракция модуля vacancies.
 */
export const VACANCY_SOURCE = {
  HH: 'HH',
  GETMATCH: 'GETMATCH',
  IT_VACANCIES: 'IT_VACANCIES',
} as const;

/**
 * §3.3: терминальные результаты — те, после которых по отклику больше нечего ждать.
 * Их запись любым путём (POST или PATCH) закрывает отклик, то есть гасит status
 * в CLOSED: держать «Открыта» рядом с отказом бессмысленно — такая запись попадала бы
 * и в фильтр «Открытые», и в массовый прогон §4.6.
 *
 * NO_RESPONSE в список не входит: «нет ответа» — состояние ожидания, а не финал.
 */
export const TERMINAL_APPLICATION_RESULTS = [
  APPLICATION_RESULT.REJECTED_BY_COMPANY,
  APPLICATION_RESULT.DECLINED_BY_ME,
  APPLICATION_RESULT.VACANCY_WITHDRAWN,
] as const;

export const DEFAULT_APPLICATION_STATUS = APPLICATION_STATUS.OPEN;

export const DEFAULT_APPLICATION_RESULT = APPLICATION_RESULT.IN_PROGRESS;

export const COMPANY_MAX_LENGTH = 255;
export const POSITION_MAX_LENGTH = 255;
export const URL_MAX_LENGTH = 2048;
export const EMPLOYER_CONTACT_MAX_LENGTH = 2000;
export const NOTES_MAX_LENGTH = 10_000;
export const SEARCH_MAX_LENGTH = 255;

export const STATUS_COLUMN_LENGTH = 16;
export const RESULT_COLUMN_LENGTH = 32;
export const VACANCY_EXTERNAL_ID_COLUMN_LENGTH = 32;
export const VACANCY_SOURCE_COLUMN_LENGTH = 16;
export const SYNC_OUTCOME_COLUMN_LENGTH = 32;

/** §5.1: допустимые значения query-параметра sort. */
export const APPLICATION_SORT_FIELDS = [
  'createdAt',
  'company',
  'hrInterviewAt',
  'techInterviewAt',
] as const;

export const APPLICATION_ORDERS = ['asc', 'desc'] as const;

export const DEFAULT_APPLICATION_SORT = 'createdAt';

export const DEFAULT_APPLICATION_ORDER = 'desc';

/**
 * Whitelist для ORDER BY: значение sort → имя свойства сущности.
 * Пользовательский ввод в SQL попадает только через эту статическую карту.
 */
export const APPLICATION_SORT_PROPERTIES = {
  createdAt: 'createdAt',
  company: 'company',
  hrInterviewAt: 'hrInterviewAt',
  techInterviewAt: 'techInterviewAt',
} as const;

export const APPLICATION_ORDER_DIRECTIONS = {
  asc: 'ASC',
  desc: 'DESC',
} as const;

export const APPLICATION_ORDER_NULLS = 'NULLS LAST';

/**
 * NULLS LAST нужен только nullable-колонкам (даты собеседований): пустые значения
 * всегда в конце, в любом направлении.
 *
 * Для NOT NULL колонок он не просто бесполезен, а вреден: Postgres строит DESC-индекс
 * как NULLS FIRST, поэтому «ORDER BY created_at DESC NULLS LAST» не может
 * воспользоваться IDX_applications_created_at.
 */
export const APPLICATION_SORT_NULLS = {
  createdAt: undefined,
  company: undefined,
  hrInterviewAt: APPLICATION_ORDER_NULLS,
  techInterviewAt: APPLICATION_ORDER_NULLS,
} as const;

/** Добивка сортировки: без неё записи с равным createdAt отдаются в случайном порядке. */
export const APPLICATION_TIEBREAK_PROPERTY = 'id';

export const APPLICATION_STATUS_CONDITION = `${APPLICATIONS_ALIAS}.status = :status`;

export const APPLICATION_RESULT_CONDITION = `${APPLICATIONS_ALIAS}.result = :result`;

/**
 * §5.1 фильтр status=OPEN: «активные» результаты, оставшиеся от статуса OPEN до того,
 * как он расщепился на OPEN/HR_INTERVIEW/TECH_INTERVIEW (§3.2). Список результатов
 * не меняется — расщепление затронуло только статус.
 */
export const OPEN_APPLICATION_RESULTS = [
  APPLICATION_RESULT.IN_PROGRESS,
  APPLICATION_RESULT.OFFER,
] as const;

/** §5.1 фильтр status=CLOSED: результаты, которые считаются закрытыми независимо от статуса. */
export const CLOSED_APPLICATION_RESULTS = [
  APPLICATION_RESULT.DECLINED_BY_ME,
  APPLICATION_RESULT.REJECTED_BY_COMPANY,
  APPLICATION_RESULT.NO_RESPONSE,
  APPLICATION_RESULT.VACANCY_WITHDRAWN,
] as const;

/**
 * §5.1 фильтр status=OPEN: статус входит в один из «активных» (§3.2), а не только
 * буквально OPEN — HR_INTERVIEW/TECH_INTERVIEW тоже считаются открытыми записями.
 */
export const APPLICATION_ACTIVE_STATUS_CONDITION = `${APPLICATIONS_ALIAS}.status IN (:...activeStatuses)`;

export const APPLICATION_OPEN_RESULT_CONDITION = `${APPLICATIONS_ALIAS}.result IN (:...openResults)`;

/**
 * §5.1 фильтр status=CLOSED: одна скобочная OR-группа, а не два верхнеуровневых
 * orWhere — те утекали мимо andWhere search/result (баг precedence), см. CHANGELOG.
 */
export const APPLICATION_CLOSED_CONDITION =
  `(${APPLICATIONS_ALIAS}.status = :closedStatus` +
  ` OR ${APPLICATIONS_ALIAS}.result IN (:...closedResults))`;

export const APPLICATION_SEARCH_CONDITION =
  `(${APPLICATIONS_ALIAS}.company ILIKE :search` +
  ` OR ${APPLICATIONS_ALIAS}.position ILIKE :search` +
  ` OR ${APPLICATIONS_ALIAS}.notes ILIKE :search)`;

export const APPLICATION_NOT_FOUND_MESSAGE = 'Запись не найдена';

/** Страховка на случай, если валидация DTO пропустит непарсящуюся дату. */
export const INVALID_DATE_MESSAGE =
  'Некорректное значение даты: ожидается ISO 8601 с явной таймзоной';

/**
 * require_protocol: false — пользователь может вставить «hh.ru/vacancy/123» без схемы;
 * протоколы ограничены http/https, чтобы не принять javascript: или file:.
 *
 * Без `as const`: @IsUrl ждёт `protocols?: string[]`, а readonly-кортеж из `as const`
 * ему не подходит. Взамен Object.freeze, потому что константа экспортируется и
 * используется шестью полями DTO (vacancyUrl, resumeUrl, interviewUrl — в create и update).
 *
 * ВАЖНО: передавать в @IsUrl только КОПИЮ (`{ ...URL_VALIDATION_OPTIONS }`).
 * validator внутри isURL вызывает merge(options, defaults), а тот дописывает
 * ~16 дефолтов В ПЕРЕДАННЫЙ объект: на замороженном это TypeError → 500,
 * на обычном — молчаливая мутация общей константы на первом же запросе.
 */
export const URL_VALIDATION_OPTIONS = Object.freeze({
  protocols: ['http', 'https'],
  require_protocol: false,
  require_tld: true,
});
