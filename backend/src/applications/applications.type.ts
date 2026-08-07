import type {
  APPLICATION_ORDERS,
  APPLICATION_RESULT,
  APPLICATION_SORT_FIELDS,
  APPLICATION_STATUS,
  SYNC_OUTCOME,
} from './applications.constants';
import type {
  ApplicationDerivedFields,
  ApplicationWritableFields,
} from './applications.interfaces';

/** §3.2 */
export type ApplicationStatus = (typeof APPLICATION_STATUS)[keyof typeof APPLICATION_STATUS];

/** §3.3 */
export type ApplicationResult = (typeof APPLICATION_RESULT)[keyof typeof APPLICATION_RESULT];

/** §4.5 */
export type SyncOutcome = (typeof SYNC_OUTCOME)[keyof typeof SYNC_OUTCOME];

export type ApplicationSortField = (typeof APPLICATION_SORT_FIELDS)[number];

export type ApplicationOrder = (typeof APPLICATION_ORDERS)[number];

/** Полный набор колонок для INSERT: поля пользователя плюс вычисленные бэкендом. */
export type ApplicationCreatePayload = ApplicationWritableFields & ApplicationDerivedFields;

/**
 * Патч для частичного обновления: присутствие ключа означает «поле надо записать»,
 * его отсутствие — «поле не трогать». Значение null пишется в колонку как null.
 *
 * Включает и вычисляемые поля: hhVacancyId попадает в патч не из тела запроса,
 * а вместе с изменением vacancyUrl (§4.2).
 */
export type ApplicationPatch = Partial<ApplicationCreatePayload>;
