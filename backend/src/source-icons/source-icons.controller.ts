import {
  BadRequestException,
  Controller,
  Get,
  Header,
  Param,
  StreamableFile,
} from '@nestjs/common';

import { readCompanyLogoOrFail } from '../logos/company-logo-response.helpers';
import {
  CONTENT_TYPE_OPTIONS_HEADER,
  CONTENT_TYPE_OPTIONS_NOSNIFF,
  LOGO_CACHE_CONTROL_HEADER,
  LOGO_CACHE_CONTROL_VALUE,
} from '../logos/company-logo.constants';
import { CompanyLogoService } from '../logos/company-logo.service';
import { hasSourceIcon, isVacancySource } from './source-icon.helpers';
import {
  SOURCE_ICON_PARAM,
  SOURCE_ICON_ROUTE,
  SOURCE_ICON_UNAVAILABLE_MESSAGE,
  SOURCE_ICON_UNKNOWN_SOURCE_MESSAGE,
  SOURCE_ICONS_ROUTE,
} from './source-icon.constants';
import { SourceIconService } from './source-icon.service';

/**
 * GET /api/vacancy-sources/:source/icon (§5.8) — favicon сайта-источника вакансий,
 * отдаётся через кэш logos/ (§4.10) той же обвязкой, что и ApplicationsController.findLogo/
 * VacancyLeadsController.findLogo: @Res не используется — иначе перестал бы работать
 * HttpExceptionFilter (§5.5).
 */
@Controller(SOURCE_ICONS_ROUTE)
export class SourceIconsController {
  constructor(
    private readonly sourceIconService: SourceIconService,
    private readonly companyLogoService: CompanyLogoService,
  ) {}

  @Get(SOURCE_ICON_ROUTE)
  @Header(LOGO_CACHE_CONTROL_HEADER, LOGO_CACHE_CONTROL_VALUE)
  @Header(CONTENT_TYPE_OPTIONS_HEADER, CONTENT_TYPE_OPTIONS_NOSNIFF)
  async getIcon(@Param(SOURCE_ICON_PARAM) source: string): Promise<StreamableFile> {
    if (!isVacancySource(source)) {
      throw new BadRequestException(SOURCE_ICON_UNKNOWN_SOURCE_MESSAGE);
    }

    // §5.8/§4.14: COMPANY_SITE — единственный признанный источник без иконки (нет
    // единого сайта-источника) — 404 без похода в SourceIconService, фронт показывает бейдж.
    const fileName = hasSourceIcon(source)
      ? await this.sourceIconService.resolveFileName(source)
      : null;

    return readCompanyLogoOrFail(
      this.companyLogoService,
      fileName,
      SOURCE_ICON_UNAVAILABLE_MESSAGE,
    );
  }
}
