import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';

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
  VACANCY_LEADS_ROUTE,
  VACANCY_LEADS_SCAN_ROUTE,
  VACANCY_LEADS_SCAN_STATUS_ROUTE,
} from './vacancy-search.constants';

/**
 * Список/скрытие лидов и запуск/статус прогона поиска (§5.7).
 *
 * ВАЖНО: маршруты 'scan' и 'scan/status' объявлены ВЫШЕ метода с ':id', иначе Express
 * сматчил бы их как значение :id — то же правило, что у sync-open в ApplicationsController (§5.2).
 */
@Controller(VACANCY_LEADS_ROUTE)
export class VacancyLeadsController {
  constructor(
    private readonly leadsService: VacancyLeadsService,
    private readonly scanService: VacancyScanService,
    private readonly scanStateService: VacancyScanStateService,
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

  @Patch(VACANCY_LEAD_BY_ID_ROUTE)
  async update(
    @Param(VACANCY_LEAD_ID_PARAM, ParseUUIDPipe) id: string,
    @Body() dto: UpdateVacancyLeadDto,
  ): Promise<VacancyLeadDto> {
    const entity = await this.leadsService.setHidden(id, dto.hidden);

    return VacancyLeadDto.fromEntity(entity);
  }
}
