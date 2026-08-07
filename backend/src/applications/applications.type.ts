import type {
  APPLICATION_ORDERS,
  APPLICATION_RESULT,
  APPLICATION_SORT_FIELDS,
  APPLICATION_STATUS,
  SYNC_OUTCOME,
} from './applications.constants';
import type { ApplicationWritableFields } from './applications.interfaces';

/** §3.2 */
export type ApplicationStatus = (typeof APPLICATION_STATUS)[keyof typeof APPLICATION_STATUS];

/** §3.3 */
export type ApplicationResult = (typeof APPLICATION_RESULT)[keyof typeof APPLICATION_RESULT];

/** §4.5 */
export type SyncOutcome = (typeof SYNC_OUTCOME)[keyof typeof SYNC_OUTCOME];

export type ApplicationSortField = (typeof APPLICATION_SORT_FIELDS)[number];

export type ApplicationOrder = (typeof APPLICATION_ORDERS)[number];

/**
 * Патч для частичного обновления: присутствие ключа означает «поле надо записать»,
 * его отсутствие — «поле не трогать». Значение null пишется в колонку как null.
 */
export type ApplicationPatch = Partial<ApplicationWritableFields>;
