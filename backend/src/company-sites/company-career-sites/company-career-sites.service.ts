import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  COMPANY_CAREER_SITE_NOT_FOUND_MESSAGE,
  COMPANY_CAREER_SITES_ORDER,
} from '../company-sites.constants';
import { CompanyCareerSite } from './company-career-site.entity';
import type { CreateCompanyCareerSiteDto } from './dto/create-company-career-site.dto';
import type { UpdateCompanyCareerSiteDto } from './dto/update-company-career-site.dto';

/**
 * CRUD над company_career_sites (§3.8, §5.9) плюс постраничное чтение по индексу
 * (findByIndex, findCount) — ими пользуется CompanySiteSearchService (§4.14): страница
 * прогона N — это N-я по счёту строка в том же порядке, что и GET (§4.14 «page = индекс
 * компании»). Repository и CompanyCareerSite импортируются как значения — этого требует
 * emitDecoratorMetadata для DI (§2.4 п.4).
 */
@Injectable()
export class CompanyCareerSitesService {
  constructor(
    @InjectRepository(CompanyCareerSite)
    private readonly sites: Repository<CompanyCareerSite>,
  ) {}

  findAll(): Promise<CompanyCareerSite[]> {
    return this.sites.find({ order: COMPANY_CAREER_SITES_ORDER });
  }

  create(dto: CreateCompanyCareerSiteDto): Promise<CompanyCareerSite> {
    const entity = this.sites.create({ name: dto.name, url: dto.url });

    return this.sites.save(entity);
  }

  async update(id: string, dto: UpdateCompanyCareerSiteDto): Promise<CompanyCareerSite> {
    const entity = await this.findOneOrFail(id);

    if (dto.name !== undefined) {
      entity.name = dto.name;
    }

    if (dto.url !== undefined) {
      entity.url = dto.url;
    }

    return this.sites.save(entity);
  }

  async remove(id: string): Promise<void> {
    const result = await this.sites.delete(id);

    if ((result.affected ?? 0) === 0) {
      throw new NotFoundException(COMPANY_CAREER_SITE_NOT_FOUND_MESSAGE);
    }
  }

  count(): Promise<number> {
    return this.sites.count();
  }

  /** §4.14: N-я строка (0-based) в порядке COMPANY_CAREER_SITES_ORDER — «страница» прогона COMPANY_SITE. */
  async findByIndex(index: number): Promise<CompanyCareerSite | null> {
    const rows = await this.sites.find({ order: COMPANY_CAREER_SITES_ORDER, skip: index, take: 1 });

    return rows[0] ?? null;
  }

  private async findOneOrFail(id: string): Promise<CompanyCareerSite> {
    const entity = await this.sites.findOneBy({ id });

    if (entity === null) {
      throw new NotFoundException(COMPANY_CAREER_SITE_NOT_FOUND_MESSAGE);
    }

    return entity;
  }
}
