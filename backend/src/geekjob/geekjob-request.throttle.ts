import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { VacancyRequestThrottle } from '../vacancies/vacancy-request.throttle';
import { GEEKJOB_MAX_REQUESTS_PER_SECOND_ENV_KEY } from './geekjob.constants';

/**
 * Троттл всех запросов к geekjob.ru (§4.11.2): страница вакансии при синхронизации
 * и preview, страница выдачи (JSON) и страница вакансии при поиске, логотипы.
 * Своя env-переменная и свой экземпляр — лимит независим от лимитов остальных
 * источников, поэтому прогон по одному источнику не отнимает слоты у другого.
 * Вся арифметика слотов — в базовом VacancyRequestThrottle (vacancies/).
 */
@Injectable()
export class GeekjobRequestThrottle extends VacancyRequestThrottle {
  constructor(configService: ConfigService) {
    super(configService.getOrThrow<number>(GEEKJOB_MAX_REQUESTS_PER_SECOND_ENV_KEY));
  }
}
