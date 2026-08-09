import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { VacanciesModule } from '../vacancies/vacancies.module';
import { Application } from './application.entity';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';

/**
 * VacanciesModule импортируется ради VacancyProviderRegistry (§4.2 — распознавание
 * ссылки при записи vacancy_url) и VacancySyncService: эндпоинты синхронизации (§5.2)
 * висят на контроллере applications. Обратного импорта нет и быть не должно — иначе цикл.
 *
 * ApplicationsService не экспортируется: он нужен только своему контроллеру, а
 * VacancySyncService работает с репозиторием напрямую (см. комментарий в vacancies.module.ts).
 */
@Module({
  imports: [TypeOrmModule.forFeature([Application]), VacanciesModule],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
})
export class ApplicationsModule {}
