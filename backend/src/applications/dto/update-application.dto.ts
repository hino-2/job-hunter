import {
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
} from 'class-validator';

import {
  ISO_8601_INSTANT_PATTERN,
  ISO_8601_INSTANT_VALIDATION_OPTIONS,
  ISO_8601_VALIDATION_OPTIONS,
} from '../../common/common.constants';
import { EmptyTextToNull, TrimText } from '../../common/string.transforms';
import { SkipIfUndefined } from '../../common/validation.decorators';
import {
  APPLICATION_RESULT,
  APPLICATION_STATUS,
  COMPANY_MAX_LENGTH,
  EMPLOYER_CONTACT_MAX_LENGTH,
  NOTES_MAX_LENGTH,
  POSITION_MAX_LENGTH,
  URL_MAX_LENGTH,
  URL_VALIDATION_OPTIONS,
} from '../applications.constants';
import type { ApplicationResult, ApplicationStatus } from '../applications.type';

/**
 * Тело PATCH /api/applications/:id (§5.1): те же поля, что в CreateApplicationDto,
 * но все опциональные. Отсутствующее поле не трогается, явный null очищает
 * nullable-поле, а null в non-nullable поле (company/status/result) даёт 400.
 *
 * Наследоваться от CreateApplicationDto нельзя: class-validator накапливает
 * метаданные родителя, поэтому @IsOptional на company здесь снял бы обязательность
 * company и в POST. Дублирование десяти полей — осознанная плата (PartialType
 * из @nestjs/mapped-types в зависимостях нет, а новые ставить в этом шаге нельзя).
 */
export class UpdateApplicationDto {
  @SkipIfUndefined()
  @IsString()
  @IsNotEmpty()
  @MaxLength(COMPANY_MAX_LENGTH)
  @TrimText()
  company?: string;

  @IsOptional()
  @IsString()
  @MaxLength(POSITION_MAX_LENGTH)
  @TrimText()
  @EmptyTextToNull()
  position?: string | null;

  @IsOptional()
  @IsUrl({ ...URL_VALIDATION_OPTIONS })
  @MaxLength(URL_MAX_LENGTH)
  @TrimText()
  @EmptyTextToNull()
  vacancyUrl?: string | null;

  @IsOptional()
  @IsUrl({ ...URL_VALIDATION_OPTIONS })
  @MaxLength(URL_MAX_LENGTH)
  @TrimText()
  @EmptyTextToNull()
  resumeUrl?: string | null;

  @IsOptional()
  @IsUrl({ ...URL_VALIDATION_OPTIONS })
  @MaxLength(URL_MAX_LENGTH)
  @TrimText()
  @EmptyTextToNull()
  interviewUrl?: string | null;

  @SkipIfUndefined()
  @IsEnum(APPLICATION_STATUS)
  status?: ApplicationStatus;

  @SkipIfUndefined()
  @IsEnum(APPLICATION_RESULT)
  result?: ApplicationResult;

  @IsOptional()
  @IsString()
  @MaxLength(EMPLOYER_CONTACT_MAX_LENGTH)
  @TrimText()
  @EmptyTextToNull()
  employerContact?: string | null;

  @IsOptional()
  @IsISO8601(ISO_8601_VALIDATION_OPTIONS)
  @Matches(ISO_8601_INSTANT_PATTERN, ISO_8601_INSTANT_VALIDATION_OPTIONS)
  hrInterviewAt?: string | null;

  @IsOptional()
  @IsISO8601(ISO_8601_VALIDATION_OPTIONS)
  @Matches(ISO_8601_INSTANT_PATTERN, ISO_8601_INSTANT_VALIDATION_OPTIONS)
  techInterviewAt?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(NOTES_MAX_LENGTH)
  @TrimText()
  @EmptyTextToNull()
  notes?: string | null;
}
