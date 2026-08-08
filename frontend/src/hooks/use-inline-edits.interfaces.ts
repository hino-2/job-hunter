import type { ApplicationUpdate } from '../types/application.interfaces';
import type { EditableTextField } from '../types/application.type';
import type { PendingById, SavedById } from './use-inline-edits.type';

/**
 * Колбэки inline-редактирования одним объектом (§7.3). Идентичность объекта не меняется
 * за всё время жизни экрана — только поэтому memo на аккордеоне имеет смысл: иначе каждое
 * нажатие клавиши перерисовывало бы весь список.
 */
export interface InlineEditHandlers {
  /** Ввод в текстовом поле: черновик + перезапуск дебаунса. */
  changeText: (id: string, field: EditableTextField, value: string) => void;
  /** Уход фокуса: отправить черновик поля немедленно. */
  blurText: (id: string, field: EditableTextField) => void;
  /** Select и DateTimePicker: сохранение сразу, без черновиков и таймеров. */
  commit: (id: string, patch: ApplicationUpdate) => void;
  /** Отправить все черновики записи — вызывается перед сворачиванием (§13.10.7). */
  flush: (id: string) => void;
  flushAll: () => void;
}

export interface InlineEditsController {
  pendingById: PendingById;
  savedById: SavedById;
  handlers: InlineEditHandlers;
}

export interface InlineEditsOptions {
  /** Показ ошибки сохранения. Обязана быть стабильной: уходит в зависимости колбэков. */
  onError: (message: string) => void;
}
