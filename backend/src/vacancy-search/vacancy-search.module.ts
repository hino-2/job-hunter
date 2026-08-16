import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ApplicationsModule } from '../applications/applications.module';
import { HhModule } from '../hh/hh.module';
import { LogosModule } from '../logos/logos.module';
import { VacancyAiModule } from '../vacancy-ai/vacancy-ai.module';
import { VacancyAiCheckService } from './vacancy-ai-check.service';
import { VacancyLeadApplicationService } from './vacancy-lead-application.service';
import { VacancyLead } from './vacancy-lead.entity';
import { VacancyLeadsController } from './vacancy-leads.controller';
import { VacancyLeadsService } from './vacancy-leads.service';
import { VacancyScanPosition } from './vacancy-scan-position.entity';
import { VacancyScanPositionService } from './vacancy-scan-position.service';
import { VacancyScanStateService } from './vacancy-scan-state.service';
import { VacancyScanService } from './vacancy-scan.service';
import { VacancySearchSettingsController } from './vacancy-search-settings.controller';
import { VacancySearchSettings } from './vacancy-search-settings.entity';
import { VacancySearchSettingsService } from './vacancy-search-settings.service';

/**
 * Модуль поиска вакансий (§4.11). Фазы B4/B5 шага 22 (§14) добавили настройки поиска
 * (§3.6, §5.7) и разбор выдачи/описания (hh/). Фаза B6/B7 — конвейер отбора
 * (§4.11.4, vacancy-scan.service.ts), асинхронный прогон (§4.11.9) и контроллер
 * vacancy-leads (§5.7). Шаг 31 (§14, §3.7, §4.11.12) добавил таблицу
 * vacancy_scan_position и VacancyScanPositionService — сохранённую позицию
 * прогона, переживающую рестарт процесса, в отличие от VacancyScanStateService
 * (только память). Зависимость модулей — VacancySearchModule → { HhModule,
 * VacancyAiModule, LogosModule, ApplicationsModule } — циклов нет: ни hh/, ни
 * vacancy-ai/, ни logos/, ни applications/ не импортируют vacancy-search/. LogosModule
 * добавлен шагом №26 (§14, §4.10) — CompanyLogoService нужен VacancyScanService для
 * скачивания логотипа лида. ApplicationsModule добавлен ради VacancyLeadApplicationService
 * (§5.7): кнопка «Отклик» создаёт запись тем же путём, что ручное создание, а
 * ApplicationsModule → vacancy-search/ обратной ссылки нет и не будет.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([VacancyLead, VacancySearchSettings, VacancyScanPosition]),
    HhModule,
    VacancyAiModule,
    LogosModule,
    ApplicationsModule,
  ],
  controllers: [VacancySearchSettingsController, VacancyLeadsController],
  providers: [
    VacancySearchSettingsService,
    VacancyLeadsService,
    VacancyScanStateService,
    VacancyScanPositionService,
    VacancyScanService,
    VacancyAiCheckService,
    VacancyLeadApplicationService,
  ],
})
export class VacancySearchModule {}
