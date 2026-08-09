import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Application } from '../applications/application.entity';
import { GetmatchModule } from '../getmatch/getmatch.module';
import { HhModule } from '../hh/hh.module';
import { VacanciesController } from './vacancies.controller';
import { VacancyProviderRegistry } from './vacancy-provider.registry';
import { VacancySyncService } from './vacancy-sync.service';

/**
 * Контракт провайдера, реестр и правила §4.3 — здесь, а не в hh/getmatch (§3 блюпринта):
 * это позволяет диспетчеризовать POST /:id/sync и /sync-open по колонке vacancy_source
 * без знания о конкретном источнике.
 *
 * ApplicationsModule сюда НЕ импортируется: зависимость идёт ровно в одну сторону,
 * ApplicationsModule → VacanciesModule → { HhModule, GetmatchModule } (эндпоинты
 * синхронизации по §5.2 принадлежат контроллеру applications). Поэтому
 * VacancySyncService получает репозиторий записей напрямую через forFeature, а не
 * через ApplicationsService — иначе получился бы цикл модулей и forwardRef.
 *
 * GetmatchModule зарегистрирован фазой B3: реестр теперь знает про оба источника.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Application]), HhModule, GetmatchModule],
  controllers: [VacanciesController],
  providers: [VacancyProviderRegistry, VacancySyncService],
  exports: [VacancyProviderRegistry, VacancySyncService],
})
export class VacanciesModule {}
