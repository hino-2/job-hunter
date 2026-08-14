import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { VacancyLead } from './vacancy-lead.entity';
import { VacancySearchSettingsController } from './vacancy-search-settings.controller';
import { VacancySearchSettings } from './vacancy-search-settings.entity';
import { VacancySearchSettingsService } from './vacancy-search-settings.service';

/**
 * Модуль поиска вакансий (§4.11). Фаза B4 шага 22 (§14) добавила настройки поиска
 * (§3.6, §5.7): VacancySearchSettingsService/Controller — GET/PUT
 * /api/vacancy-search-settings. Разбор выдачи и описания живёт в hh/ (фаза B5,
 * §4.11.3, §4.11.7) — этот модуль его пока не импортирует: конвейер отбора
 * (§4.11.4), асинхронный прогон (§4.11.9) и контроллеры vacancy-leads (§5.7) —
 * фазы B6–B7, отдельный запуск. Зависимость модулей по блюпринту —
 * VacancySearchModule → { HhModule, VacancyAiModule } — появится вместе
 * с первым потребителем HhSearchService (шаг B6).
 */
@Module({
  imports: [TypeOrmModule.forFeature([VacancyLead, VacancySearchSettings])],
  controllers: [VacancySearchSettingsController],
  providers: [VacancySearchSettingsService],
})
export class VacancySearchModule {}
