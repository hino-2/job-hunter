import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { HhModule } from '../hh/hh.module';
import { CompanyCareerSitesController } from './company-career-sites/company-career-sites.controller';
import { CompanyCareerSite } from './company-career-sites/company-career-site.entity';
import { CompanyCareerSitesService } from './company-career-sites/company-career-sites.service';
import { CompanySiteParserRegistry } from './company-site-parser/company-site-parser.registry';
import { CompanySiteSearchService } from './company-site-search/company-site-search.service';
import { buildCompanySiteHttpOptions } from './company-sites.helpers';
import { CompanySiteHttpClient } from './company-sites.http-client';
import { CompanySiteRequestThrottle } from './company-sites.throttle';
import { AviasalesSiteParser } from './parsers/aviasales/aviasales.parser';
import { DodoSiteParser } from './parsers/dodo/dodo.parser';
import { HhSearchSiteParser } from './parsers/hh-search/hh-search.parser';
import { KonturSiteParser } from './parsers/kontur/kontur.parser';
import { MagnitTechSiteParser } from './parsers/magnit-tech/magnit-tech.parser';
import { RzdSiteParser } from './parsers/rzd/rzd.parser';
import { WildberriesSiteParser } from './parsers/wildberries/wildberries.parser';
import { X5SiteParser } from './parsers/x5/x5.parser';

/**
 * §4.14: интеграция с сайтами компаний — четвёртый источник поиска лидов
 * (VACANCY_LEAD_SEARCH_SOURCES), без синхронизации. CompanyCareerSitesController
 * обслуживает CRUD /api/company-career-sites (§5.9); CompanySiteSearchService —
 * VacancyLeadSearchProvider, экспортируется ради VacancySearchModule (тот же приём,
 * что HhModule/ItVacanciesModule/GeekjobModule).
 *
 * Зависимости модулей: company-sites/ → { hh/ (HhSearchSiteParser переиспользует
 * HhSearchService целиком), vacancies/ (общие HTTP-хелперы/троттл), applications/
 * (VACANCY_SOURCE), database/ (COLUMN_TYPE) } — без обратной ссылки на vacancy-search/,
 * та импортирует этот модуль, а не наоборот.
 *
 * HttpModule.registerAsync — module-scoped, как у остальных источников: свои
 * заголовки/таймаут/потолок размера ответа, но БЕЗ baseURL (§4.14/B1) — каждый парсер
 * ходит по абсолютному URL на свой константный хост.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([CompanyCareerSite]),
    HttpModule.registerAsync({
      inject: [ConfigService],
      useFactory: buildCompanySiteHttpOptions,
    }),
    HhModule,
  ],
  controllers: [CompanyCareerSitesController],
  providers: [
    CompanySiteRequestThrottle,
    CompanySiteHttpClient,
    CompanyCareerSitesService,
    HhSearchSiteParser,
    KonturSiteParser,
    X5SiteParser,
    AviasalesSiteParser,
    RzdSiteParser,
    WildberriesSiteParser,
    MagnitTechSiteParser,
    DodoSiteParser,
    CompanySiteParserRegistry,
    CompanySiteSearchService,
  ],
  exports: [CompanySiteSearchService],
})
export class CompanySitesModule {}
