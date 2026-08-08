import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Application } from '../applications/application.entity';
import { HhApiService } from './hh-api.service';
import { buildHhHttpOptions } from './hh-http-options.factory';
import { HhSyncService } from './hh-sync.service';
import { HhController } from './hh.controller';

/**
 * Модуль интеграции с hh.ru (§4): preview (§5.3) и применение результатов
 * синхронизации к записям (§4.3).
 *
 * ApplicationsModule сюда НЕ импортируется: зависимость идёт ровно в одну сторону,
 * ApplicationsModule → HhModule (эндпоинты синхронизации по §5.2 принадлежат
 * контроллеру applications). Поэтому HhSyncService получает репозиторий записей
 * напрямую через forFeature, а не через ApplicationsService — иначе получился бы
 * цикл модулей и forwardRef.
 *
 * Парсер URL сюда не подключён провайдером намеренно — см. комментарий в hh-url.parser.ts.
 */
@Module({
  imports: [
    HttpModule.registerAsync({
      inject: [ConfigService],
      useFactory: buildHhHttpOptions,
    }),
    TypeOrmModule.forFeature([Application]),
  ],
  controllers: [HhController],
  providers: [HhApiService, HhSyncService],
  exports: [HhApiService, HhSyncService],
})
export class HhModule {}
