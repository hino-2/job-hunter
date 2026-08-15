import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
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
import { FindVacancyLeadsQueryDto } from './dto/find-vacancy-leads.query.dto';
import { ScanAcceptedDto } from './dto/scan-accepted.dto';
import { ScanStatusDto } from './dto/scan-status.dto';
import { UpdateVacancyLeadDto } from './dto/update-vacancy-lead.dto';
import { VacancyLeadDto } from './dto/vacancy-lead.dto';
import { VacancyLeadsService } from './vacancy-leads.service';
import { VacancyScanStateService } from './vacancy-scan-state.service';
import { VacancyScanService } from './vacancy-scan.service';
import {
  VACANCY_LEAD_BY_ID_ROUTE,
  VACANCY_LEAD_ID_PARAM,
  VACANCY_LEAD_LOGO_ROUTE,
  VACANCY_LEADS_ROUTE,
  VACANCY_LEADS_SCAN_ROUTE,
  VACANCY_LEADS_SCAN_STATUS_ROUTE,
} from './vacancy-search.constants';

/**
 * Список/скрытие лидов и запуск/статус прогона поиска (§5.7).
 *
 * ВАЖНО: маршруты 'scan', 'scan/status' и ':id/logo' объявлены ВЫШЕ метода с ':id',
 * иначе Express сматчил бы их хвост как значение :id — то же правило, что у
 * sync-open/:id/logo в ApplicationsController (§5.2, §4.10, шаг №26 §14).
 */
@Controller(VACANCY_LEADS_ROUTE)
export class VacancyLeadsController {
  constructor(
    private readonly leadsService: VacancyLeadsService,
    private readonly scanService: VacancyScanService,
    private readonly scanStateService: VacancyScanStateService,
    private readonly companyLogoService: CompanyLogoService,
  ) {}

  @Get()
  async findAll(@Query() query: FindVacancyLeadsQueryDto): Promise<VacancyLeadDto[]> {
    const entities = await this.leadsService.findAll(query);

    return entities.map((entity) => VacancyLeadDto.fromEntity(entity));
  }

  /** POST /api/vacancy-leads/scan (§5.7, §4.11.9) — 202 сразу, 409 при уже идущем прогоне. */
  @Post(VACANCY_LEADS_SCAN_ROUTE)
  @HttpCode(HttpStatus.ACCEPTED)
  scan(): ScanAcceptedDto {
    const startedAt = this.scanService.start();

    return ScanAcceptedDto.fromStartedAt(startedAt);
  }

  /** GET /api/vacancy-leads/scan/status (§5.7) — прогресс во время прогона, итог после. */
  @Get(VACANCY_LEADS_SCAN_STATUS_ROUTE)
  status(): ScanStatusDto {
    return ScanStatusDto.fromState(this.scanStateService.snapshot());
  }

  /**
   * GET /api/vacancy-leads/:id/logo (§4.10, §4.11, §5.7, шаг №26 §14) — байты логотипа
   * компании лида, ровно та же обвязка, что у ApplicationsController.findLogo: заголовки
   * кэша и nosniff ставим сами, @Res не используется — иначе перестал бы работать
   * HttpExceptionFilter (§5.5).
   */
  @Get(VACANCY_LEAD_LOGO_ROUTE)
  @Header(LOGO_CACHE_CONTROL_HEADER, LOGO_CACHE_CONTROL_VALUE)
  @Header(CONTENT_TYPE_OPTIONS_HEADER, CONTENT_TYPE_OPTIONS_NOSNIFF)
  async findLogo(@Param(VACANCY_LEAD_ID_PARAM, ParseUUIDPipe) id: string): Promise<StreamableFile> {
    const entity = await this.leadsService.findOneOrFail(id);

    return readCompanyLogoOrFail(this.companyLogoService, entity.companyLogoFile);
  }

  @Patch(VACANCY_LEAD_BY_ID_ROUTE)
  async update(
    @Param(VACANCY_LEAD_ID_PARAM, ParseUUIDPipe) id: string,
    @Body() dto: UpdateVacancyLeadDto,
  ): Promise<VacancyLeadDto> {
    const entity = await this.leadsService.setHidden(id, dto.hidden);

    return VacancyLeadDto.fromEntity(entity);
  }
}
