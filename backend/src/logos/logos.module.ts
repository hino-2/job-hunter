import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { buildCompanyLogoHttpOptions } from './company-logo-http-options.factory';
import { CompanyLogoService } from './company-logo.service';

/**
 * Модуль хранения логотипов компаний (§4.10). Не импортирует ни ApplicationsModule,
 * ни VacanciesModule — CompanyLogoService ничего не знает про Application и про
 * правила §4.3, поэтому оба модуля импортируют LogosModule сами
 * (ApplicationsModule → LogosModule, VacanciesModule → LogosModule), без цикла и
 * forwardRef.
 *
 * HttpModule.registerAsync зарегистрирован здесь по тому же принципу, что у
 * hh.module.ts/getmatch.module.ts: у клиента логотипов свои опции axios
 * (arraybuffer, свой таймаут, без baseURL).
 */
@Module({
  imports: [
    HttpModule.registerAsync({
      inject: [ConfigService],
      useFactory: buildCompanyLogoHttpOptions,
    }),
  ],
  providers: [CompanyLogoService],
  exports: [CompanyLogoService],
})
export class LogosModule {}
