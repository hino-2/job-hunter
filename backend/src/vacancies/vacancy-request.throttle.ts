import { delay } from '../common/async.helpers';
import { MS_PER_SECOND } from './vacancies.constants';

/**
 * Общий на процесс троттл запросов к одному источнику вакансий (§4.11.2): страница
 * вакансии при синхронизации и preview, страница выдачи и вакансии при поиске,
 * логотипы с CDN источника — всё идёт через один и тот же лимит частоты, а не
 * только поиск.
 *
 * Класс намеренно НЕ @Injectable: лимит у каждого источника свой (своя env-переменная,
 * свой экземпляр), поэтому DI-провайдером выступает наследник в модуле источника, а
 * здесь живёт только арифметика слотов.
 *
 * Троттл только задерживает запросы: он не отменяет их и не меняет исходы §4.5.
 *
 * Слот резервируется СИНХРОННО, до первого await — тот же эталон, что в
 * mapWithConcurrency (common/async.helpers.ts): иначе конкурентные вызовы прочитали
 * бы один и тот же nextAvailableAt и стартовали бы одновременно.
 */
export class VacancyRequestThrottle {
  private readonly minIntervalMs: number;
  private nextAvailableAt = 0;

  constructor(requestsPerSecond: number) {
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
