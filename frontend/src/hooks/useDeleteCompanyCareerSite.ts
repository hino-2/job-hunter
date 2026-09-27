import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { deleteCompanyCareerSite } from '../api/company-career-sites.api';
import { COMPANY_CAREER_SITES_QUERY_KEY } from '../constants/query.constants';
import type { DeleteCompanyCareerSiteOptions } from './use-delete-company-career-site.interfaces';

/**
 * Удаление строки без подтверждения (§7.9). Без оптимистичного удаления из кэша:
 * список короткий, а лишний откат при ошибке не стоит сложности — успех просто
 * инвалидирует запрос целиком.
 */
export function useDeleteCompanyCareerSite(
  options: DeleteCompanyCareerSiteOptions,
): UseMutationResult<void, Error, string> {
  const { onFailed } = options;
  const client = useQueryClient();

  return useMutation({
    mutationFn: deleteCompanyCareerSite,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: COMPANY_CAREER_SITES_QUERY_KEY });
    },
    onError: (error) => {
      onFailed(error);
    },
  });
}
