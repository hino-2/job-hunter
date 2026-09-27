import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { createCompanyCareerSite } from '../api/company-career-sites.api';
import { COMPANY_CAREER_SITES_QUERY_KEY } from '../constants/query.constants';
import type {
  CompanyCareerSite,
  CompanyCareerSiteCreate,
} from '../types/company-career-site.interfaces';
import type { CreateCompanyCareerSiteOptions } from './use-create-company-career-site.interfaces';

/**
 * Добавление строки таблицы «Сайты компаний» (§7.9, §5.9). Без оптимистичной вставки:
 * позиция новой записи в упорядоченном по name ASC списке клиенту неизвестна,
 * поэтому список просто инвалидируется целиком (тот же приём, что useCreateApplication).
 */
export function useCreateCompanyCareerSite(
  options: CreateCompanyCareerSiteOptions,
): UseMutationResult<CompanyCareerSite, Error, CompanyCareerSiteCreate> {
  const { onCreated, onFailed } = options;
  const client = useQueryClient();

  return useMutation({
    mutationFn: createCompanyCareerSite,
    onSuccess: (created) => {
      void client.invalidateQueries({ queryKey: COMPANY_CAREER_SITES_QUERY_KEY });
      onCreated(created);
    },
    onError: (error) => {
      onFailed(error);
    },
  });
}
