import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { HhModule } from '../hh/hh.module';
import { Application } from './application.entity';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';

/**
 * HhModule импортируется ради HhSyncService: эндпоинты синхронизации (§5.2) висят
 * на контроллере applications. Обратного импорта нет и быть не должно — иначе цикл.
 *
 * ApplicationsService не экспортируется: он нужен только своему контроллеру, а
 * HhSyncService работает с репозиторием напрямую (см. комментарий в hh.module.ts).
 */
@Module({
  imports: [TypeOrmModule.forFeature([Application]), HhModule],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
})
export class ApplicationsModule {}
