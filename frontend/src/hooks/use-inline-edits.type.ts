import type { EditableField, PendingTextValues } from '../types/application.type';

/** Черновики по id записи (§7.3): нет ключа — поле не трогали, показывается кэш. */
export type PendingById = Readonly<Record<string, PendingTextValues>>;

/** Поля, подсвеченные как «сохранено», по id записи (§7.3). */
export type SavedById = Readonly<Record<string, ReadonlySet<EditableField>>>;

/** Идентификатор таймера: в браузере number, в jsdom/Node — объект Timeout. */
export type TimerId = ReturnType<typeof setTimeout>;
