import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { GetmatchApiService } from './getmatch-api.service';
import { buildGetmatchHttpOptions } from './getmatch-http-options.factory';

/**
 * Модуль интеграции с getmatch.ru (§4.9): GetmatchApiService реализует
 * VacancySourceProvider и провайдится/экспортируется, чтобы VacanciesModule
 * мог собрать из него запись реестра. Зеркало hh.module.ts.
 *
 * HttpModule.registerAsync зарегистрирован внутри этого модуля намеренно (а не
 * в vacancies/): у каждого источника свой baseURL, поэтому HttpService должен
 * быть module-scoped — второй HttpService со своим baseURL требует своей
 * регистрации в своём модуле, отдельно от HhModule.
 */
@Module({
  imports: [
    HttpModule.registerAsync({
      inject: [ConfigService],
      useFactory: buildGetmatchHttpOptions,
    }),
  ],
  providers: [GetmatchApiService],
  exports: [GetmatchApiService],
})
export class GetmatchModule {}
