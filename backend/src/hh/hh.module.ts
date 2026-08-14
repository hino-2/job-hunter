import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { HhApiService } from './hh-api.service';
import { buildHhHttpOptions } from './hh-http-options.factory';
import { HhRequestThrottle } from './hh-request.throttle';
import { HhSearchService } from './hh-search.service';

/**
 * Модуль интеграции с hh.ru (§4.1, §4.2, §4.11): HhApiService реализует
 * VacancySourceProvider и провайдится/экспортируется, чтобы VacanciesModule мог
 * собрать из него запись реестра. HhSearchService (шаг 22, §4.11.2–4.11.3, §4.11.7) —
 * обращения конвейера поиска (страница выдачи, описание вакансии); экспортируется
 * для VacancySearchModule, который импортирует HhModule ради него (§4.11).
 *
 * Ни контроллера, ни TypeOrmModule.forFeature здесь больше нет — preview (§5.3) и
 * применение результатов синхронизации (§4.3) переехали в vacancies/ (шаг B2):
 * они общие для всех источников, а не специфичны для hh.
 *
 * HttpModule.registerAsync зарегистрирован внутри этого модуля намеренно (а не в
 * vacancies/): у каждого источника свой baseURL, поэтому HttpService должен быть
 * module-scoped — второй источник (getmatch) регистрирует свой клиент в своём модуле.
 * HhSearchService переиспользует тот же HttpService: страница выдачи запрашивается
 * по абсолютному URL (игнорирует baseURL), страница вакансии — по тому же относительному
 * пути, что и синхронизация.
 *
 * HhRequestThrottle (§4.11.2) — общий на процесс лимит частоты запросов к hh.ru,
 * экспортируется отдельно от HhApiService: логотипы компаний с hhcdn.ru скачивает
 * CompanyLogoService в logos/, а слот приезжает туда данными через
 * HhApiService.acquireRequestSlot, а не прямым импортом HhRequestThrottle.
 */
@Module({
  imports: [
    HttpModule.registerAsync({
      inject: [ConfigService],
      useFactory: buildHhHttpOptions,
    }),
  ],
  providers: [HhApiService, HhRequestThrottle, HhSearchService],
  exports: [HhApiService, HhRequestThrottle, HhSearchService],
})
export class HhModule {}
