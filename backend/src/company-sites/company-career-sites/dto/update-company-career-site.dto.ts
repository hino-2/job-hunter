import { IsNotEmpty, IsString, IsUrl, MaxLength } from 'class-validator';

import { COMPANY_MAX_LENGTH, URL_MAX_LENGTH } from '../../../applications/applications.constants';
import { SkipIfUndefined } from '../../../common/validation.decorators';
import { TrimText } from '../../../common/string.transforms';
import { COMPANY_CAREER_SITE_URL_VALIDATION_OPTIONS } from '../../company-sites.constants';

/**
 * Тело PATCH /api/company-career-sites/:id (§5.9): оба поля опциональны, отсутствие —
 * «не трогать», явный null — 400 (§10 п.4: name/url не nullable колонки). Пустое тело —
 * не-операция, отвечает 200 с записью как есть.
 */
export class UpdateCompanyCareerSiteDto {
  @SkipIfUndefined()
  @IsString()
  @IsNotEmpty()
  @MaxLength(COMPANY_MAX_LENGTH)
  @TrimText()
  name?: string;

  @SkipIfUndefined()
  @IsString()
  @IsUrl({ ...COMPANY_CAREER_SITE_URL_VALIDATION_OPTIONS })
  @MaxLength(URL_MAX_LENGTH)
  @TrimText()
  url?: string;
}
