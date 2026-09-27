import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { VacancyRequestThrottle } from '../vacancies/vacancy-request.throttle';
import { COMPANY_SITE_MAX_REQUESTS_PER_SECOND_ENV_KEY } from './company-sites.constants';

/**
 * §4.14/§4.11.2: один общий троттл на ВСЕ хосты сайтов компаний — в отличие от hh.ru/
 * it-vacancies.ru/geekjob.ru (свой троттл на источник), company-sites/ обслуживает
 * десятки разных хостов одним небольшим лимитом: разводить лимит по каждому хосту
 * означало бы провайдер на каждый будущий парсер, а суммарный трафик по всем сайтам
 * компаний вместе взятым и так на порядок меньше, чем у одного hh.ru.
 */
@Injectable()
export class CompanySiteRequestThrottle extends VacancyRequestThrottle {
  constructor(configService: ConfigService) {
    super(configService.getOrThrow<number>(COMPANY_SITE_MAX_REQUESTS_PER_SECOND_ENV_KEY));
  }
}
