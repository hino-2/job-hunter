/**
 * Доменные константы записи: ручная копия §3.2 / §3.3 / §4.5 / §4.8 из
 * backend/src/applications/applications.constants.ts плюс ru-подписи и карты оформления.
 *
 * Shared-пакет заводить нельзя (§3.4) — enum-ы дублируются вручную. Порядок ключей
 * и написание значений менять только вместе с бэкендом; расхождение видно при diff'е
 * двух файлов, а забытая подпись ломает tsc, потому что все карты — Record<Union, T>.
 *
 * Здесь же единственное место, где живут русские подписи enum-ов.
 */

// В @mui/icons-material v9 базовых алиасов CheckCircleOutline / ErrorOutline больше нет —
// остались только *Outlined-варианты тех же глифов.
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import ErrorOutlinedIcon from '@mui/icons-material/ErrorOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';

import type {
  ApplicationOrder,
  ApplicationResult,
  ApplicationSortField,
  ApplicationStatus,
  EditableField,
  IconComponent,
  PendingTextValues,
  ResultChipColor,
  StatusFilter,
  SyncIconColor,
  SyncOutcome,
  VacancySource,
} from '../types/application.type';
import type {
  Application,
  ApplicationsFilters,
  ApplicationUpdate,
  CreateApplicationFormValues,
} from '../types/application.interfaces';

/** §3.2 */
export const APPLICATION_STATUS = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
} as const;

/** §3.3 */
export const APPLICATION_RESULT = {
  IN_PROGRESS: 'IN_PROGRESS',
  OFFER: 'OFFER',
  REJECTED_BY_COMPANY: 'REJECTED_BY_COMPANY',
  DECLINED_BY_ME: 'DECLINED_BY_ME',
  NO_RESPONSE: 'NO_RESPONSE',
  VACANCY_WITHDRAWN: 'VACANCY_WITHDRAWN',
} as const;

/** §4.5 */
export const SYNC_OUTCOME = {
  OK: 'OK',
  NOT_FOUND: 'NOT_FOUND',
  SKIPPED_UNSUPPORTED: 'SKIPPED_UNSUPPORTED',
  RATE_LIMITED: 'RATE_LIMITED',
  ERROR: 'ERROR',
} as const;

/** §4.8 */
export const VACANCY_SOURCE = {
  HH: 'HH',
  GETMATCH: 'GETMATCH',
} as const;

/** Порядок пунктов Select'а «Статус» (§7.2.2, ряд 1). */
export const APPLICATION_STATUS_ORDER = [
  APPLICATION_STATUS.OPEN,
  APPLICATION_STATUS.CLOSED,
] as const;

/** Порядок пунктов Select'а «Результат» (§7.2.2, ряд 1) — как в §3.3. */
export const APPLICATION_RESULT_ORDER = [
  APPLICATION_RESULT.IN_PROGRESS,
  APPLICATION_RESULT.OFFER,
  APPLICATION_RESULT.REJECTED_BY_COMPANY,
  APPLICATION_RESULT.DECLINED_BY_ME,
  APPLICATION_RESULT.NO_RESPONSE,
  APPLICATION_RESULT.VACANCY_WITHDRAWN,
] as const;

/**
 * Поля §7.2.2, которые редактируются текстом: у них blur-сохранение плюс debounce-автосейв
 * (§7.3). Остальные редактируемые поля (Select'ы и DateTimePicker'ы) сохраняются сразу
 * по onChange, промежуточного состояния у них нет.
 */
export const EDITABLE_TEXT_FIELDS = [
  'company',
  'position',
  'vacancyUrl',
  'resumeUrl',
  'employerContact',
  'interviewUrl',
  'notes',
] as const;

/**
 * Текстовые поля, которые API проверяет как URL (§5.1). Заведомо кривую ссылку
 * не отправляем вовсе, иначе гарантированный 400 вместо подсказки на самом поле.
 */
export const URL_TEXT_FIELDS = ['vacancyUrl', 'resumeUrl', 'interviewUrl'] as const;

/** Все редактируемые поля раскрытого состояния (§7.2.2) — в порядке рядов 1–2. */
export const EDITABLE_FIELDS = [
  'company',
  'position',
  'vacancyUrl',
  'resumeUrl',
  'status',
  'result',
  'hrInterviewAt',
  'techInterviewAt',
  'employerContact',
  'interviewUrl',
  'notes',
] as const;

/** Подписи полей раскрытого состояния (§7.2.2). */
export const APPLICATION_FIELD_LABELS: Record<EditableField, string> = {
  company: 'Компания',
  position: 'Должность',
  status: 'Статус',
  result: 'Результат',
  vacancyUrl: 'Ссылка на вакансию',
  resumeUrl: 'Ссылка на резюме',
  hrInterviewAt: 'HR-собес',
  techInterviewAt: 'Тех-собес',
  employerContact: 'Контакт работодателя',
  interviewUrl: 'Где собес',
  notes: 'Заметки',
};

/**
 * Сохранное чтение поля записи в патч. Record<EditableField, …> не даёт забыть поле
 * при расширении списка, а прямая запись по union-ключу (previous[field] = …) невозможна:
 * TS требует значение, присваиваемое пересечению типов всех полей, — здесь это never.
 */
export const APPLICATION_FIELD_PICKERS: Record<
  EditableField,
  (application: Application) => ApplicationUpdate
> = {
  company: (application) => ({ company: application.company }),
  position: (application) => ({ position: application.position }),
  status: (application) => ({ status: application.status }),
  result: (application) => ({ result: application.result }),
  vacancyUrl: (application) => ({ vacancyUrl: application.vacancyUrl }),
  resumeUrl: (application) => ({ resumeUrl: application.resumeUrl }),
  hrInterviewAt: (application) => ({ hrInterviewAt: application.hrInterviewAt }),
  techInterviewAt: (application) => ({ techInterviewAt: application.techInterviewAt }),
  employerContact: (application) => ({ employerContact: application.employerContact }),
  interviewUrl: (application) => ({ interviewUrl: application.interviewUrl }),
  notes: (application) => ({ notes: application.notes }),
};

/**
 * Стабильная ссылка на «правок нет»: литерал {} в useState создавал бы новый объект
 * на каждый рендер-цикл и ломал бы мемоизацию values.
 */
export const EMPTY_PENDING_TEXT_VALUES: PendingTextValues = {};

/** Та же стабильная ссылка, но для «в этой записи ничего не подсвечено» (§7.3). */
export const EMPTY_SAVED_FIELDS: ReadonlySet<EditableField> = new Set<EditableField>();

/** Пустое текстовое поле в UI — '' , а не null: контролируемый input не принимает null. */
export const EMPTY_TEXT_FIELD_VALUE = '';

/** §5.1: company — обязательное поле, пустым его в PATCH не отправляем. */
export const COMPANY_REQUIRED_MESSAGE = 'Компания обязательна';

/** §5.1: значение не пройдёт @IsUrl на бэкенде, поэтому PATCH не отправляется. */
export const INVALID_URL_MESSAGE = 'Некорректная ссылка';

/** Текст Snackbar'а, когда сервер не объяснил причину (§5.5, §7.3). */
export const SAVE_ERROR_FALLBACK_MESSAGE = 'Не удалось сохранить изменения';

export const OPEN_LINK_LABEL = 'Открыть в новой вкладке';

/**
 * Ограничения длин — ручная копия backend/src/applications/applications.constants.ts:91,
 * тем же приёмом, что и enum-ы (§3.4). Здесь они нужны как maxLength у полей ввода:
 * обрезать лишнее на входе дешевле, чем ловить 400 от @MaxLength.
 */
export const COMPANY_MAX_LENGTH = 255;
export const POSITION_MAX_LENGTH = 255;
export const URL_MAX_LENGTH = 2048;
export const EMPLOYER_CONTACT_MAX_LENGTH = 2000;
export const NOTES_MAX_LENGTH = 10_000;

/** Подписи §3.2. */
export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  OPEN: 'Открыта',
  CLOSED: 'Закрыта',
};

/** Подписи §3.3. */
export const APPLICATION_RESULT_LABELS: Record<ApplicationResult, string> = {
  IN_PROGRESS: 'В процессе',
  OFFER: 'Оффер',
  REJECTED_BY_COMPANY: 'Отказ компании',
  DECLINED_BY_ME: 'Отказался сам',
  NO_RESPONSE: 'Нет ответа',
  VACANCY_WITHDRAWN: 'Вакансия снята',
};

/** Подписи §4.5. */
export const SYNC_OUTCOME_LABELS: Record<SyncOutcome, string> = {
  OK: 'Обновлено',
  NOT_FOUND: 'Вакансия не найдена (снята)',
  SKIPPED_UNSUPPORTED: 'Источник не поддерживается',
  RATE_LIMITED: 'Лимит запросов источника',
  ERROR: 'Ошибка обновления',
};

/** Подписи §4.8: источник вакансии, показывается третьей строкой tooltip'а SyncStatusIcon. */
export const VACANCY_SOURCE_LABELS: Record<VacancySource, string> = {
  HH: 'hh.ru',
  GETMATCH: 'getmatch.ru',
};

export const VACANCY_SOURCE_UNKNOWN_LABEL = 'Источник не определён';
export const SYNC_SOURCE_TOOLTIP_PREFIX = 'Источник: ';

/** §7.2.3 */
export const APPLICATION_RESULT_CHIP_COLORS: Record<ApplicationResult, ResultChipColor> = {
  IN_PROGRESS: 'default',
  OFFER: 'success',
  REJECTED_BY_COMPANY: 'error',
  DECLINED_BY_ME: 'default',
  NO_RESPONSE: 'default',
  VACANCY_WITHDRAWN: 'default',
};

/**
 * §7.2.3: «строка с непустым lastSyncError — иконка цветом error». Отдельной проверки
 * поля в компоненте нет и не нужно: непустой lastSyncError бэкенд пишет только вместе
 * с не-OK исходом, а все не-OK исходы здесь и так не зелёные.
 */
export const SYNC_OUTCOME_ICON_COLORS: Record<SyncOutcome, SyncIconColor> = {
  OK: 'success',
  NOT_FOUND: 'warning',
  SKIPPED_UNSUPPORTED: 'warning',
  RATE_LIMITED: 'error',
  ERROR: 'error',
};

export const SYNC_OUTCOME_ICONS: Record<SyncOutcome, IconComponent> = {
  OK: CheckCircleOutlinedIcon,
  NOT_FOUND: WarningAmberOutlinedIcon,
  SKIPPED_UNSUPPORTED: WarningAmberOutlinedIcon,
  RATE_LIMITED: ErrorOutlinedIcon,
  ERROR: ErrorOutlinedIcon,
};

export const SYNC_NEVER_LABEL = 'Ещё не синхронизировалось';
export const SYNC_OK_TOOLTIP_PREFIX = 'Обновлено ';
export const SYNC_ICON_COLOR_NEVER: SyncIconColor = 'disabled';

export const EMPTY_VALUE_PLACEHOLDER = '—';

/** Пока счётчик шапки грузится, вместо чисел стоит многоточие — отдельного спиннера нет. */
export const COUNTS_PENDING_PLACEHOLDER = '…';

/**
 * Стабильная ссылка на пустой список: литерал [] в месте использования создавал бы
 * новый массив каждый рендер и обнулял мемоизацию производных значений.
 */
export const EMPTY_APPLICATIONS: readonly Application[] = [];

/** §7.1: ALL — «без фильтра», в query-параметры не попадает. */
export const STATUS_FILTER = {
  ALL: 'ALL',
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
} as const;

/** Порядок кнопок переключателя. */
export const STATUS_FILTER_ORDER = [
  STATUS_FILTER.ALL,
  STATUS_FILTER.OPEN,
  STATUS_FILTER.CLOSED,
] as const;

export const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  ALL: 'Все',
  OPEN: 'Открытые',
  CLOSED: 'Закрытые',
};

/** §5.1: допустимые значения sort, в порядке пунктов выпадающего списка. */
export const APPLICATION_SORT_ORDER_LIST = [
  'createdAt',
  'company',
  'hrInterviewAt',
  'techInterviewAt',
] as const;

export const APPLICATION_SORT_LABELS: Record<ApplicationSortField, string> = {
  createdAt: 'По дате добавления',
  company: 'По компании',
  hrInterviewAt: 'По HR-собесу',
  techInterviewAt: 'По тех-собесу',
};

export const APPLICATION_ORDER = {
  ASC: 'asc',
  DESC: 'desc',
} as const;

export const DEFAULT_APPLICATION_SORT: ApplicationSortField = 'createdAt';
export const DEFAULT_APPLICATION_ORDER: ApplicationOrder = APPLICATION_ORDER.DESC;

export const DEFAULT_APPLICATION_FILTERS: ApplicationsFilters = {
  status: STATUS_FILTER.OPEN,
  search: '',
  sort: DEFAULT_APPLICATION_SORT,
  order: DEFAULT_APPLICATION_ORDER,
};

/** Форма диалога создания (§7.4) в чистом виде: поля пусты, результат — «В процессе». */
export const CREATE_APPLICATION_INITIAL_VALUES: CreateApplicationFormValues = {
  vacancyUrl: EMPTY_TEXT_FIELD_VALUE,
  company: EMPTY_TEXT_FIELD_VALUE,
  position: EMPTY_TEXT_FIELD_VALUE,
  resumeUrl: EMPTY_TEXT_FIELD_VALUE,
  employerContact: EMPTY_TEXT_FIELD_VALUE,
  hrInterviewAt: null,
  techInterviewAt: null,
  result: APPLICATION_RESULT.IN_PROGRESS,
  notes: EMPTY_TEXT_FIELD_VALUE,
};

export const CREATE_SUCCESS_MESSAGE = 'Вакансия добавлена';
export const CREATE_ERROR_FALLBACK_MESSAGE = 'Не удалось добавить запись';
export const DELETE_SUCCESS_MESSAGE = 'Запись удалена';
export const DELETE_ERROR_FALLBACK_MESSAGE = 'Не удалось удалить запись';
export const PREVIEW_ERROR_FALLBACK_MESSAGE = 'Не удалось получить данные о вакансии';
