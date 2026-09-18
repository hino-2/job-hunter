import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { GeekjobApiService } from './geekjob-api.service';
import { buildGeekjobHttpOptions } from './geekjob-http-options.factory';
import { GeekjobRequestThrottle } from './geekjob-request.throttle';
import { GeekjobSearchService } from './geekjob-search.service';

/**
 * Модуль интеграции с geekjob.ru (§4.8, §4.11, §4.13): GeekjobApiService реализует
 * VacancySourceProvider (синхронизация), GeekjobSearchService — VacancyLeadSearchProvider
 * (поиск лидов). Оба экспортируются: первый нужен VacanciesModule для записи реестра
 * источников, второй — VacancySearchModule для реестра источников поиска. Зеркало
 * it-vacancies.module.ts.
 *
 * HttpModule.registerAsync зарегистрирован внутри этого модуля намеренно (а не в
 * vacancies/): у каждого источника свой baseURL, поэтому HttpService должен быть
 * module-scoped.
 *
 * GeekjobRequestThrottle провайдится один раз на модуль и делится между обоими
 * сервисами — иначе синхронизация и прогон поиска имели бы по своему лимиту частоты
 * и вместе превышали бы бюджет запросов к источнику (§4.11.2).
 */
@Module({
  imports: [
    HttpModule.registerAsync({
      inject: [ConfigService],
      useFactory: buildGeekjobHttpOptions,
    }),
  ],
  providers: [GeekjobRequestThrottle, GeekjobApiService, GeekjobSearchService],
  exports: [GeekjobApiService, GeekjobSearchService],
})
export class GeekjobModule {}
