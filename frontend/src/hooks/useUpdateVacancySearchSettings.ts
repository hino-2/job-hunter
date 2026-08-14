import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { updateVacancySearchSettings } from '../api/vacancy-search.api';
import { VACANCY_SEARCH_SETTINGS_QUERY_KEY } from '../constants/query.constants';
import type {
  VacancySearchSettings,
  VacancySearchSettingsUpdate,
} from '../types/vacancy-search.interfaces';
import type { UpdateVacancySearchSettingsOptions } from './use-update-vacancy-search-settings.interfaces';

/**
 * Сохранение настроек поиска (§7.9.4): PUT ресурса целиком. На идущий прогон
 * не влияет — vacancy-scan.service читает настройки заново при следующем запуске,
 * поэтому мутация не трогает ключ статуса прогона.
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
      onSaved(settings);
    },
    onError: (error) => {
      onFailed(error);
    },
  });
}
