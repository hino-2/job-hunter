import { useMutation } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { previewVacancy } from '../api/hh.api';
import type { HhPreview } from '../types/hh.interfaces';
import type { HhPreviewOptions } from './use-hh-preview.interfaces';

/**
 * Preview по blur ссылки (§4.4). Живёт внутри диалога создания, а не в App: если диалог
 * закрыли во время запроса, наблюдатель разрушается вместе с ним и колбэки просто
 * не вызываются — «ответ выбросить» получается бесплатно, без флагов отмены.
 */
export function useHhPreview(
  options: HhPreviewOptions,
): UseMutationResult<HhPreview, Error, string> {
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
