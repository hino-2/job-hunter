/**
 * Доменные константы записи: ручная копия §3.2 / §3.3 / §4.5 из
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
  IconComponent,
  ResultChipColor,
  StatusFilter,
  SyncIconColor,
  SyncOutcome,
} from '../types/application.type';
import type { Application, ApplicationsFilters } from '../types/application.interfaces';

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
  SKIPPED_NOT_HH: 'SKIPPED_NOT_HH',
  RATE_LIMITED: 'RATE_LIMITED',
  ERROR: 'ERROR',
} as const;

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
  SKIPPED_NOT_HH: 'Не вакансия hh.ru',
  RATE_LIMITED: 'Лимит запросов hh.ru',
  ERROR: 'Ошибка обновления',
};

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
  SKIPPED_NOT_HH: 'warning',
  RATE_LIMITED: 'error',
  ERROR: 'error',
};

export const SYNC_OUTCOME_ICONS: Record<SyncOutcome, IconComponent> = {
  OK: CheckCircleOutlinedIcon,
  NOT_FOUND: WarningAmberOutlinedIcon,
  SKIPPED_NOT_HH: WarningAmberOutlinedIcon,
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
  status: STATUS_FILTER.ALL,
  search: '',
  sort: DEFAULT_APPLICATION_SORT,
  order: DEFAULT_APPLICATION_ORDER,
};
