import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { VacancyRequestThrottle } from '../vacancies/vacancy-request.throttle';
import { IT_VACANCIES_MAX_REQUESTS_PER_SECOND_ENV_KEY } from './it-vacancies.constants';

/**
 * Троттл всех запросов к it-vacancies.ru (§4.11.2): страница вакансии при
 * синхронизации и preview, страница выдачи и вакансии при поиске, логотипы с
 * api.it-vacancies.ru. Своя env-переменная и свой экземпляр — лимит независим от
 * лимита hh.ru, поэтому прогон по одному источнику не отнимает слоты у другого.
 * Вся арифметика слотов — в базовом VacancyRequestThrottle (vacancies/).
 */
@Injectable()
export class ItVacanciesRequestThrottle extends VacancyRequestThrottle {
  constructor(configService: ConfigService) {
    super(configService.getOrThrow<number>(IT_VACANCIES_MAX_REQUESTS_PER_SECOND_ENV_KEY));
  }
}
