import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

import { TrimText } from '../../common/string.transforms';
import {
  VACANCY_LEADS_HIDDEN_FILTERS,
  VACANCY_LEADS_ORDERS,
  VACANCY_LEADS_SEARCH_MAX_LENGTH,
  VACANCY_LEADS_SORT_FIELDS,
} from '../vacancy-search.constants';
import type {
  VacancyLeadsHiddenFilter,
  VacancyLeadsOrder,
  VacancyLeadsSortField,
} from '../vacancy-search.type';

/**
 * Query-параметры GET /api/vacancy-leads (§5.7) — все опциональные, дефолты
 * (exclude / publishedAt / desc) применяет VacancyLeadsService через `??`,
 * тем же приёмом, что FindApplicationsQueryDto (§5.1).
 */
export class FindVacancyLeadsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(VACANCY_LEADS_SEARCH_MAX_LENGTH)
  @TrimText()
  search?: string;

  @IsOptional()
  @IsIn(VACANCY_LEADS_HIDDEN_FILTERS)
  hidden?: VacancyLeadsHiddenFilter;

  @IsOptional()
  @IsIn(VACANCY_LEADS_SORT_FIELDS)
  sort?: VacancyLeadsSortField;

  @IsOptional()
  @IsIn(VACANCY_LEADS_ORDERS)
  order?: VacancyLeadsOrder;
}
