import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { VacancySyncService } from '../vacancies/vacancy-sync.service';
import {
  APPLICATION_BY_ID_ROUTE,
  APPLICATION_ID_PARAM,
  APPLICATION_SYNC_ROUTE,
  APPLICATIONS_ROUTE,
  APPLICATIONS_SYNC_OPEN_ROUTE,
} from './applications.constants';
import { ApplicationsService } from './applications.service';
import { ApplicationDto } from './dto/application.dto';
import { CreateApplicationDto } from './dto/create-application.dto';
import { FindApplicationsQueryDto } from './dto/find-applications.query.dto';
import { SyncResultDto } from './dto/sync-result.dto';
import { SyncSummaryDto } from './dto/sync-summary.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';

/**
 * CRUD ресурса applications (§5.1) и запуск синхронизации (§5.2).
 *
 * ВАЖНО: маршруты POST 'sync-open' и POST ':id/sync' объявлены ВЫШЕ методов с ':id',
 * иначе Express сматчит 'sync-open' как значение :id (§5.2). Не переставлять.
 */
@Controller(APPLICATIONS_ROUTE)
export class ApplicationsController {
  constructor(
    private readonly applicationsService: ApplicationsService,
    private readonly vacancySyncService: VacancySyncService,
  ) {}

  @Get()
  async findAll(@Query() query: FindApplicationsQueryDto): Promise<ApplicationDto[]> {
    const entities = await this.applicationsService.findAll(query);

    return entities.map((entity) => ApplicationDto.fromEntity(entity));
  }

  @Post()
  async create(@Body() dto: CreateApplicationDto): Promise<ApplicationDto> {
    const entity = await this.applicationsService.create(dto);

    return ApplicationDto.fromEntity(entity);
  }

  /**
   * POST /api/applications/sync-open (§5.2) — прогон по всем записям со status = OPEN.
   *
   * @HttpCode(OK): по умолчанию Nest отвечает на POST 201, а ресурс здесь не создаётся.
   */
  @Post(APPLICATIONS_SYNC_OPEN_ROUTE)
  @HttpCode(HttpStatus.OK)
  async syncOpen(): Promise<SyncSummaryDto> {
    const summary = await this.vacancySyncService.syncOpen();

    return SyncSummaryDto.fromSummary(summary);
  }

  /**
   * POST /api/applications/:id/sync (§5.2) — синхронизация одной записи.
   *
   * В отличие от VacanciesController, неуспешный исход в HTTP-ошибку здесь НЕ
   * отображается: §5.2 требует отдавать любой outcome (включая ERROR и RATE_LIMITED)
   * с кодом 200 — это результат операции, а не сбой запроса. 404 бывает ровно один:
   * записи нет в БД.
   */
  @Post(APPLICATION_SYNC_ROUTE)
  @HttpCode(HttpStatus.OK)
  async syncOne(@Param(APPLICATION_ID_PARAM, ParseUUIDPipe) id: string): Promise<SyncResultDto> {
    const result = await this.vacancySyncService.syncById(id);

    return SyncResultDto.fromResult(result);
  }

  @Get(APPLICATION_BY_ID_ROUTE)
  async findOne(@Param(APPLICATION_ID_PARAM, ParseUUIDPipe) id: string): Promise<ApplicationDto> {
    const entity = await this.applicationsService.findOneOrFail(id);

    return ApplicationDto.fromEntity(entity);
  }

  @Patch(APPLICATION_BY_ID_ROUTE)
  async update(
    @Param(APPLICATION_ID_PARAM, ParseUUIDPipe) id: string,
    @Body() dto: UpdateApplicationDto,
  ): Promise<ApplicationDto> {
    const entity = await this.applicationsService.update(id, dto);

    return ApplicationDto.fromEntity(entity);
  }

  @Delete(APPLICATION_BY_ID_ROUTE)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param(APPLICATION_ID_PARAM, ParseUUIDPipe) id: string): Promise<void> {
    return this.applicationsService.remove(id);
  }
}
