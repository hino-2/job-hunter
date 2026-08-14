import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { VacancyLead } from './vacancy-lead.entity';
import { VacancySearchSettings } from './vacancy-search-settings.entity';

/**
 * Минимальный модуль фазы B3 шага 22 (§14): регистрирует обе сущности §3.5/§3.6
 * и больше ничего не делает. Разбор выдачи, конвейер отбора (§4.11.4), асинхронный
 * прогон (§4.11.9) и контроллеры §5.7 — фазы B4–B7, отдельный запуск. Зависимость
 * модулей по блюпринту — VacancySearchModule → { HhModule, VacancyAiModule } —
 * появится вместе с первым сервисом, который будет её использовать.
 */
@Module({
  imports: [TypeOrmModule.forFeature([VacancyLead, VacancySearchSettings])],
})
export class VacancySearchModule {}
