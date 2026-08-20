import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { updateVacancySearchSettings } from '../api/vacancy-search.api';
import {
  VACANCY_SCAN_STATUS_QUERY_KEY,
  VACANCY_SEARCH_SETTINGS_QUERY_KEY,
} from '../constants/query.constants';
import type {
  VacancySearchSettings,
  VacancySearchSettingsUpdate,
} from '../types/vacancy-search.interfaces';
import type { UpdateVacancySearchSettingsOptions } from './use-update-vacancy-search-settings.interfaces';

/**
 * Сохранение настроек поиска (§7.9.4): PUT ресурса целиком. Идущий прогон не затрагивает —
 * vacancy-scan.service читает настройки заново только при следующем запуске (снимок берётся
 * один раз при старте, §5.7). Ключ статуса прогона всё же инвалидируется (§4.11.12):
 * available каждого среза resumeBySource зависит от шаблона ссылки своего источника,
 * и сохранённое изменение любого из них обязано мгновенно дизейблить устаревшую кнопку
 * «Продолжить», не дожидаясь планового опроса.
 */
export function useUpdateVacancySearchSettings(
  options: UpdateVacancySearchSettingsOptions,
): UseMutationResult<VacancySearchSettings, Error, VacancySearchSettingsUpdate> {
  const { onSaved, onFailed } = options;
  const client = useQueryClient();

  return useMutation({
    mutationFn: updateVacancySearchSettings,
    onSuccess: (settings) => {
      void client.invalidateQueries({ queryKey: VACANCY_SEARCH_SETTINGS_QUERY_KEY });
      void client.invalidateQueries({ queryKey: VACANCY_SCAN_STATUS_QUERY_KEY });
      onSaved(settings);
    },
    onError: (error) => {
      onFailed(error);
    },
  });
}
