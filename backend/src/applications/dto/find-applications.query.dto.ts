import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

import { TrimText } from '../../common/string.transforms';
import {
  APPLICATION_ORDERS,
  APPLICATION_RESULT,
  APPLICATION_SORT_FIELDS,
  APPLICATION_STATUS,
  SEARCH_MAX_LENGTH,
} from '../applications.constants';
import type {
  ApplicationOrder,
  ApplicationResult,
  ApplicationSortField,
  ApplicationStatus,
} from '../applications.type';

/**
 * Query-параметры GET /api/applications (§5.1) — все опциональные.
 *
 * Дефолты (createdAt / desc) намеренно НЕ заданы инициализаторами полей:
 * с exposeUnsetFields: false инициализатор всё равно не сработал бы предсказуемо,
 * поэтому дефолты применяет сервис через `??`.
 */
export class FindApplicationsQueryDto {
  @IsOptional()
  @IsEnum(APPLICATION_STATUS)
  status?: ApplicationStatus;

  @IsOptional()
  @IsEnum(APPLICATION_RESULT)
  result?: ApplicationResult;

  @IsOptional()
  @IsString()
  @MaxLength(SEARCH_MAX_LENGTH)
  @TrimText()
  search?: string;

  @IsOptional()
  @IsIn(APPLICATION_SORT_FIELDS)
  sort?: ApplicationSortField;

  @IsOptional()
  @IsIn(APPLICATION_ORDERS)
  order?: ApplicationOrder;
}
