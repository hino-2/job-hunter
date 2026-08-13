import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LogosModule } from '../logos/logos.module';
import { VacanciesModule } from '../vacancies/vacancies.module';
import { Application } from './application.entity';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';

/**
 * VacanciesModule импортируется ради VacancyProviderRegistry (§4.2 — распознавание
 * ссылки при записи vacancy_url) и VacancySyncService: эндпоинты синхронизации (§5.2)
 * висят на контроллере applications. Обратного импорта нет и быть не должно — иначе цикл.
 *
 * LogosModule (§4.10) импортируется ради CompanyLogoService — контроллеру нужен он сам,
 * чтобы читать байты логотипа для GET /:id/logo; LogosModule не зависит ни от applications,
 * ни от vacancies, поэтому оба импортируют его напрямую без цикла и forwardRef.
 *
 * ApplicationsService не экспортируется: он нужен только своему контроллеру, а
 * VacancySyncService работает с репозиторием напрямую (см. комментарий в vacancies.module.ts).
 */
@Module({
  imports: [TypeOrmModule.forFeature([Application]), VacanciesModule, LogosModule],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
})
export class ApplicationsModule {}
