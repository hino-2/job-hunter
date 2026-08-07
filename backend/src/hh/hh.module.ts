import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { HhApiService } from './hh-api.service';
import { buildHhHttpOptions } from './hh-http-options.factory';
import { HhController } from './hh.controller';

/**
 * Модуль интеграции с hh.ru (§4). Пока отдаёт только preview (§5.3); в шаге 6 сюда
 * добавится hh-sync.service, и тогда модуль начнёт импортировать ApplicationsModule.
 *
 * Парсер URL сюда не подключён провайдером намеренно — см. комментарий в hh-url.parser.ts.
 */
@Module({
  imports: [
    HttpModule.registerAsync({
      inject: [ConfigService],
      useFactory: buildHhHttpOptions,
    }),
  ],
  controllers: [HhController],
  providers: [HhApiService],
  exports: [HhApiService],
})
export class HhModule {}
