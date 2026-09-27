import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { updateCompanyCareerSite } from '../api/company-career-sites.api';
import { COMPANY_CAREER_SITES_QUERY_KEY } from '../constants/query.constants';
import type { CompanyCareerSite } from '../types/company-career-site.interfaces';
import type {
  UpdateCompanyCareerSiteOptions,
  UpdateCompanyCareerSiteVariables,
} from './use-update-company-career-site.interfaces';

/**
 * Автосейв одного поля строки (§7.9, §5.9). Без оптимистичного патча кэша, в отличие
 * от useUpdateApplication: url меняет ещё и parserSupported (сервер сам пересчитывает его
 * при ответе), клиент значение parserSupported предсказать не может — поэтому успех
 * просто инвалидирует список целиком.
 */
export function useUpdateCompanyCareerSite(
  options: UpdateCompanyCareerSiteOptions,
): UseMutationResult<CompanyCareerSite, Error, UpdateCompanyCareerSiteVariables> {
  const { onFailed } = options;
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({ id, patch }: UpdateCompanyCareerSiteVariables) =>
      updateCompanyCareerSite(id, patch),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: COMPANY_CAREER_SITES_QUERY_KEY });
    },
    onError: (error, variables) => {
      onFailed(error, variables);
    },
  });
}
