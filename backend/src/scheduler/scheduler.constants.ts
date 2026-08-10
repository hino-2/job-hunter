/** Литералы модуля планировщика (§4.7): env-ключи, имя интервала, тексты логов. */

export const SCHEDULED_SYNC_ENABLED_ENV_KEY = 'SCHEDULED_SYNC_ENABLED';
export const SCHEDULED_SYNC_INTERVAL_MS_ENV_KEY = 'SCHEDULED_SYNC_INTERVAL_MS';

/**
 * По этому имени интервал лежит в SchedulerRegistry, и по нему же его снимает
 * SchedulerOrchestrator на завершении приложения — свой хук уборки не заводим.
 */
export const SCHEDULED_SYNC_INTERVAL_NAME = 'scheduled-sync';

export const MS_IN_MINUTE = 60_000;

export const SCHEDULED_SYNC_DISABLED_MESSAGE =
  'Плановая синхронизация выключена (SCHEDULED_SYNC_ENABLED=false)';

export const SCHEDULED_SYNC_ENABLED_MESSAGE = 'Плановая синхронизация включена, интервал';

export const SCHEDULED_SYNC_TICK_MESSAGE = 'Плановая синхронизация: старт';

export const SCHEDULED_SYNC_OVERLAP_MESSAGE =
  'Предыдущая плановая синхронизация ещё идёт — тик пропущен';

export const SCHEDULED_SYNC_FAILED_MESSAGE = 'Плановая синхронизация прервалась ошибкой';
