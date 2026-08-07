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

import {
  APPLICATION_BY_ID_ROUTE,
  APPLICATION_ID_PARAM,
  APPLICATIONS_ROUTE,
} from './applications.constants';
import { ApplicationsService } from './applications.service';
import { ApplicationDto } from './dto/application.dto';
import { CreateApplicationDto } from './dto/create-application.dto';
import { FindApplicationsQueryDto } from './dto/find-applications.query.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';

/**
 * CRUD ресурса applications (§5.1).
 *
 * ВАЖНО для шага 6: маршруты POST 'sync-open' и POST ':id/sync' должны быть
 * объявлены ВЫШЕ методов с ':id', иначе Express сматчит 'sync-open' как :id (§5.2).
 */
@Controller(APPLICATIONS_ROUTE)
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

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
