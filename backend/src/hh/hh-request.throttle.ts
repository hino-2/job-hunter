import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { VacancyRequestThrottle } from '../vacancies/vacancy-request.throttle';
import { HH_MAX_REQUESTS_PER_SECOND_ENV_KEY } from './hh.constants';

/**
 * Троттл всех запросов к hh.ru (§4.11.2). Вся арифметика слотов — в базовом
 * VacancyRequestThrottle (vacancies/), здесь остаётся только чтение своей
 * env-переменной: лимит hh.ru независим от лимита остальных источников.
 */
@Injectable()
export class HhRequestThrottle extends VacancyRequestThrottle {
  constructor(configService: ConfigService) {
    super(configService.getOrThrow<number>(HH_MAX_REQUESTS_PER_SECOND_ENV_KEY));
  }
}
