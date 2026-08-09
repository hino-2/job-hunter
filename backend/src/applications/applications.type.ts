import type {
  APPLICATION_ORDERS,
  APPLICATION_RESULT,
  APPLICATION_SORT_FIELDS,
  APPLICATION_STATUS,
  SYNC_OUTCOME,
  VACANCY_SOURCE,
} from './applications.constants';
import type { Application } from './application.entity';
import type {
  ApplicationDerivedFields,
  ApplicationSyncFields,
  ApplicationWritableFields,
} from './applications.interfaces';

/** §3.2 */
export type ApplicationStatus = (typeof APPLICATION_STATUS)[keyof typeof APPLICATION_STATUS];

/** §3.3 */
export type ApplicationResult = (typeof APPLICATION_RESULT)[keyof typeof APPLICATION_RESULT];

/** §4.5 */
export type SyncOutcome = (typeof SYNC_OUTCOME)[keyof typeof SYNC_OUTCOME];

/** §4.8 */
export type VacancySource = (typeof VACANCY_SOURCE)[keyof typeof VACANCY_SOURCE];

export type ApplicationSortField = (typeof APPLICATION_SORT_FIELDS)[number];

export type ApplicationOrder = (typeof APPLICATION_ORDERS)[number];

/** Полный набор колонок для INSERT: поля пользователя плюс вычисленные бэкендом. */
export type ApplicationCreatePayload = ApplicationWritableFields & ApplicationDerivedFields;

/**
 * Патч для частичного обновления: присутствие ключа означает «поле надо записать»,
 * его отсутствие — «поле не трогать». Значение null пишется в колонку как null.
 *
 * Включает и вычисляемые поля: vacancySource/vacancyExternalId попадают в патч
 * не из тела запроса, а вместе с изменением vacancyUrl (§4.2).
 */
export type ApplicationPatch = Partial<ApplicationCreatePayload>;

/**
 * Счётчики исходов в сводке массового прогона (§5.2). Record, а не Partial:
 * все пять ключей обязаны присутствовать в ответе, в том числе с нулями.
 */
export type SyncOutcomeCounts = Record<SyncOutcome, number>;

/**
 * Патч синхронизации (§4.3): присутствие ключа означает «колонку надо записать»,
 * его отсутствие — «не трогать». Отдельный тип от ApplicationPatch, потому что
 * синхронизации нельзя дать даже теоретическую возможность записать company,
 * position или result.
 */
export type ApplicationSyncPatch = Partial<ApplicationSyncFields>;

/**
 * Снимок тех же колонок, но с типами сущности: до первой синхронизации last_sync_outcome
 * в записи ещё null, тогда как патч всегда пишет конкретный исход.
 *
 * Нужен для отката в памяти: патч применяется к сущности до save(), и если save() упал,
 * наружу не должно уехать состояние, которого в БД нет.
 */
export type ApplicationSyncSnapshot = Pick<Application, keyof ApplicationSyncFields>;
