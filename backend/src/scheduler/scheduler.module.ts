import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { VacanciesModule } from '../vacancies/vacancies.module';
import { ScheduledSyncService } from './scheduled-sync.service';

/**
 * §4.7. ScheduleModule.forRoot() вызывается ровно здесь и больше нигде (он global:
 * true) — тем же принципом, по которому TypeOrmModule.forRootAsync живёт в
 * database.module.ts, а не в app.module.ts.
 *
 * Зависимость идёт SchedulerModule → VacanciesModule, обратного импорта нет.
 * Контроллеров и экспортов нет — наружу модуль ничего не публикует (эндпоинта
 * статуса планировщика не заводим).
 */
@Module({
  imports: [ScheduleModule.forRoot(), VacanciesModule],
  providers: [ScheduledSyncService],
})
export class SchedulerModule {}
