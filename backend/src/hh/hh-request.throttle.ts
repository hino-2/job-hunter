import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { delay } from '../common/async.helpers';
import { HH_MAX_REQUESTS_PER_SECOND_ENV_KEY, MS_PER_SECOND } from './hh.constants';

/**
 * Общий на процесс троттл всех запросов к hh.ru (§4.11.2): страница вакансии при
 * синхронизации и preview, страница выдачи и вакансии при поиске, логотипы с
 * hhcdn.ru — всё идёт через один и тот же лимит частоты, а не только поиск.
 *
 * Троттл только задерживает запросы: он не отменяет их и не меняет исходы §4.5.
 *
 * Слот резервируется СИНХРОННО, до первого await — тот же эталон, что в
 * mapWithConcurrency (common/async.helpers.ts): иначе конкурентные вызовы прочитали
 * бы один и тот же nextAvailableAt и стартовали бы одновременно.
 */
@Injectable()
export class HhRequestThrottle {
  private readonly minIntervalMs: number;
  private nextAvailableAt = 0;

  constructor(configService: ConfigService) {
    const requestsPerSecond = configService.getOrThrow<number>(HH_MAX_REQUESTS_PER_SECOND_ENV_KEY);

    this.minIntervalMs = MS_PER_SECOND / requestsPerSecond;
  }

  acquire(): Promise<void> {
    const startAt = Math.max(this.nextAvailableAt, Date.now());

    // Резервируем слот до await — см. комментарий к классу.
    this.nextAvailableAt = startAt + this.minIntervalMs;

    const wait = startAt - Date.now();

    if (wait <= 0) {
      return Promise.resolve();
    }

    return delay(wait);
  }
}
