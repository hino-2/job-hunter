import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { HhModule } from '../hh/hh.module';
import { VacancyAiModule } from '../vacancy-ai/vacancy-ai.module';
import { VacancyAiCheckService } from './vacancy-ai-check.service';
import { VacancyLead } from './vacancy-lead.entity';
import { VacancyLeadsController } from './vacancy-leads.controller';
import { VacancyLeadsService } from './vacancy-leads.service';
import { VacancyScanStateService } from './vacancy-scan-state.service';
import { VacancyScanService } from './vacancy-scan.service';
import { VacancySearchSettingsController } from './vacancy-search-settings.controller';
import { VacancySearchSettings } from './vacancy-search-settings.entity';
import { VacancySearchSettingsService } from './vacancy-search-settings.service';

/**
 * Модуль поиска вакансий (§4.11). Фазы B4/B5 шага 22 (§14) добавили настройки поиска
 * (§3.6, §5.7) и разбор выдачи/описания (hh/). Фаза B6/B7 — конвейер отбора
 * (§4.11.4, vacancy-scan.service.ts), асинхронный прогон (§4.11.9) и контроллер
 * vacancy-leads (§5.7). Зависимость модулей — VacancySearchModule → { HhModule,
 * VacancyAiModule } — циклов нет: ни hh/, ни vacancy-ai/ не импортируют vacancy-search/.
 */
@Module({
  imports: [TypeOrmModule.forFeature([VacancyLead, VacancySearchSettings]), HhModule, VacancyAiModule],
  controllers: [VacancySearchSettingsController, VacancyLeadsController],
  providers: [
    VacancySearchSettingsService,
    VacancyLeadsService,
    VacancyScanStateService,
    VacancyScanService,
    VacancyAiCheckService,
  ],
})
export class VacancySearchModule {}
