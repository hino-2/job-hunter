import { IsNotEmpty, IsString, IsUrl, MaxLength } from 'class-validator';

import { COMPANY_MAX_LENGTH, URL_MAX_LENGTH } from '../../../applications/applications.constants';
import { TrimText } from '../../../common/string.transforms';
import { COMPANY_CAREER_SITE_URL_VALIDATION_OPTIONS } from '../../company-sites.constants';

/** Тело POST /api/company-career-sites (§5.9). */
export class CreateCompanyCareerSiteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(COMPANY_MAX_LENGTH)
  @TrimText()
  name!: string;

  @IsString()
  @IsUrl({ ...COMPANY_CAREER_SITE_URL_VALIDATION_OPTIONS })
  @MaxLength(URL_MAX_LENGTH)
  @TrimText()
  url!: string;
}
