import type { VacancySearchSettings } from '../types/vacancy-search.interfaces';

/**
 * Колбэки исхода PUT /api/vacancy-search-settings (§7.9.4). onSaved получает свежий
 * ресурс, но диалог его сейчас не использует — просто закрывается по вызову; аргумент
 * оставлен на будущее (если понадобится подставить пересчитанные сервером поля обратно
 * в форму).
 */
export interface UpdateVacancySearchSettingsOptions {
  onSaved: (settings: VacancySearchSettings) => void;
  onFailed: (error: Error) => void;
}
