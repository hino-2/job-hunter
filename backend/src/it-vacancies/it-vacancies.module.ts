import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ItVacanciesApiService } from './it-vacancies-api.service';
import { buildItVacanciesHttpOptions } from './it-vacancies-http-options.factory';
import { ItVacanciesRequestThrottle } from './it-vacancies-request.throttle';
import { ItVacanciesSearchService } from './it-vacancies-search.service';

/**
 * Модуль интеграции с it-vacancies.ru (§4.8, §4.11): ItVacanciesApiService
 * реализует VacancySourceProvider (синхронизация), ItVacanciesSearchService —
 * VacancyLeadSearchProvider (поиск лидов). Оба экспортируются: первый нужен
 * VacanciesModule для записи реестра источников, второй — VacancySearchModule
 * для реестра источников поиска. Зеркало hh.module.ts.
 *
 * HttpModule.registerAsync зарегистрирован внутри этого модуля намеренно (а не
 * в vacancies/): у каждого источника свой baseURL, поэтому HttpService должен
 * быть module-scoped.
 *
 * ItVacanciesRequestThrottle провайдится один раз на модуль и делится между
 * обоими сервисами — иначе синхронизация и прогон поиска имели бы по своему
 * лимиту частоты и вместе превышали бы бюджет запросов к источнику (§4.11.2).
 */
@Module({
  imports: [
    HttpModule.registerAsync({
      inject: [ConfigService],
      useFactory: buildItVacanciesHttpOptions,
    }),
  ],
  providers: [ItVacanciesRequestThrottle, ItVacanciesApiService, ItVacanciesSearchService],
  exports: [ItVacanciesApiService, ItVacanciesSearchService],
})
export class ItVacanciesModule {}
