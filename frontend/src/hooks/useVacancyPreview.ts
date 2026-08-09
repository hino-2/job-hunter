import { useMutation } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { previewVacancy } from '../api/vacancies.api';
import type { VacancyPreview } from '../types/vacancy.interfaces';
import type { VacancyPreviewOptions } from './use-vacancy-preview.interfaces';

/**
 * Preview по blur ссылки (§4.4). Живёт внутри диалога создания, а не в App: если диалог
 * закрыли во время запроса, наблюдатель разрушается вместе с ним и колбэки просто
 * не вызываются — «ответ выбросить» получается бесплатно, без флагов отмены.
 */
export function useVacancyPreview(
  options: VacancyPreviewOptions,
): UseMutationResult<VacancyPreview, Error, string> {
  const { onLoaded, onFailed } = options;

  return useMutation({
    mutationFn: previewVacancy,
    onSuccess: (preview, url) => {
      onLoaded(preview, url);
    },
    onError: (error) => {
      onFailed(error);
    },
  });
}
