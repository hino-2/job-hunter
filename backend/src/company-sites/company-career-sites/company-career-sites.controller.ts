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
} from '@nestjs/common';

import { CompanySiteParserRegistry } from '../company-site-parser/company-site-parser.registry';
import {
  COMPANY_CAREER_SITE_BY_ID_ROUTE,
  COMPANY_CAREER_SITE_ID_PARAM,
  COMPANY_CAREER_SITES_ROUTE,
} from '../company-sites.constants';
import { CompanyCareerSitesService } from './company-career-sites.service';
import { CompanyCareerSiteDto } from './dto/company-career-site.dto';
import { CreateCompanyCareerSiteDto } from './dto/create-company-career-site.dto';
import { UpdateCompanyCareerSiteDto } from './dto/update-company-career-site.dto';
import type { CompanyCareerSite } from './company-career-site.entity';

/** CRUD ресурса company-career-sites (§5.9) — редактируемый список «Сайты компаний» (§7.9). */
@Controller(COMPANY_CAREER_SITES_ROUTE)
export class CompanyCareerSitesController {
  constructor(
    private readonly sites: CompanyCareerSitesService,
    private readonly parsers: CompanySiteParserRegistry,
  ) {}

  @Get()
  async findAll(): Promise<CompanyCareerSiteDto[]> {
    const entities = await this.sites.findAll();

    return entities.map((entity) => this.toDto(entity));
  }

  @Post()
  async create(@Body() dto: CreateCompanyCareerSiteDto): Promise<CompanyCareerSiteDto> {
    const entity = await this.sites.create(dto);

    return this.toDto(entity);
  }

  @Patch(COMPANY_CAREER_SITE_BY_ID_ROUTE)
  async update(
    @Param(COMPANY_CAREER_SITE_ID_PARAM, ParseUUIDPipe) id: string,
    @Body() dto: UpdateCompanyCareerSiteDto,
  ): Promise<CompanyCareerSiteDto> {
    const entity = await this.sites.update(id, dto);

    return this.toDto(entity);
  }

  @Delete(COMPANY_CAREER_SITE_BY_ID_ROUTE)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param(COMPANY_CAREER_SITE_ID_PARAM, ParseUUIDPipe) id: string): Promise<void> {
    return this.sites.remove(id);
  }

  private toDto(entity: CompanyCareerSite): CompanyCareerSiteDto {
    return CompanyCareerSiteDto.fromEntity(entity, this.parsers.resolve(entity.url) !== null);
  }
}
