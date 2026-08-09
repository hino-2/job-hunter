import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { HhApiService } from './hh-api.service';
import { buildHhHttpOptions } from './hh-http-options.factory';

/**
 * Модуль интеграции с hh.ru (§4.1, §4.2): HhApiService реализует VacancySourceProvider
 * и провайдится/экспортируется, чтобы VacanciesModule мог собрать из него запись реестра.
 *
 * Ни контроллера, ни TypeOrmModule.forFeature здесь больше нет — preview (§5.3) и
 * применение результатов синхронизации (§4.3) переехали в vacancies/ (шаг B2):
 * они общие для всех источников, а не специфичны для hh.
 *
 * HttpModule.registerAsync зарегистрирован внутри этого модуля намеренно (а не в
 * vacancies/): у каждого источника свой baseURL, поэтому HttpService должен быть
 * module-scoped — второй источник (getmatch) регистрирует свой клиент в своём модуле.
 */
@Module({
  imports: [
    HttpModule.registerAsync({
      inject: [ConfigService],
      useFactory: buildHhHttpOptions,
    }),
  ],
  providers: [HhApiService],
  exports: [HhApiService],
})
export class HhModule {}
