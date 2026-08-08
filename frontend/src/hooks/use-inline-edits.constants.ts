import type { PendingById, SavedById } from './use-inline-edits.type';

/**
 * Разделитель составного ключа таймера дебаунса — «id:поле». Двоеточия нет ни в uuid,
 * ни в именах полей, поэтому коллизия ключей невозможна.
 */
export const PENDING_KEY_SEPARATOR = ':';

/**
 * Стабильные пустые словари: литерал {} в useState создавал бы новый объект на каждый
 * рендер-цикл и обнулял бы мемоизацию срезов, которые уходят в аккордеоны.
 */
export const EMPTY_PENDING_BY_ID: PendingById = {};
export const EMPTY_SAVED_BY_ID: SavedById = {};
