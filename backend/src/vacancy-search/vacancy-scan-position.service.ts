import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { VacancyScanPosition } from './vacancy-scan-position.entity';
import {
  VACANCY_SCAN_INITIAL_PAGE,
  VACANCY_SCAN_POSITION_MISSING_MESSAGE,
  VACANCY_SCAN_POSITION_SAVE_FAILED_MESSAGE,
  VACANCY_SCAN_POSITION_SINGLETON_ID,
} from './vacancy-search.constants';
import type { VacancyScanPositionSnapshot } from './vacancy-search.interfaces';

/**
 * §3.7: единственная строка позиции прогона поиска. Строку засевает миграция
 * CreateVacancyScanPositionTable — сервис её НЕ создаёт (тот же принцип, что у
 * VacancySearchSettingsService.find()): второй путь появления данных означал бы
 * гонку на старте. Отсутствие строки — повреждение схемы, а не штатный случай.
 *
 * save()/clear() никогда не бросают наружу (только logger.warn) — сбой записи
 * позиции деградирует «Продолжить», но не должен превращать хороший прогон в
 * ERROR (§4.11.12).
 */
@Injectable()
export class VacancyScanPositionService {
  private readonly logger = new Logger(VacancyScanPositionService.name);

  constructor(
    @InjectRepository(VacancyScanPosition)
    private readonly position: Repository<VacancyScanPosition>,
  ) {}

  /** Бросает 500, если строки нет: её создаёт миграция, второй путь появления данных запрещён (§3.7). */
  async load(): Promise<VacancyScanPositionSnapshot> {
    const entity = await this.position.findOneBy({ id: VACANCY_SCAN_POSITION_SINGLETON_ID });

    if (entity === null) {
      this.logger.error(
        'Строка позиции прогона поиска вакансий отсутствует в БД: миграция ' +
          'CreateVacancyScanPositionTable не выполнена или строка удалена вручную',
      );

      throw new InternalServerErrorException(VACANCY_SCAN_POSITION_MISSING_MESSAGE);
    }

    return { nextPage: entity.nextPage, searchText: entity.searchText };
  }

  /**
   * Никогда не бросает наружу — сбой записи позиции не должен ронять прогон.
   * Узкий UPDATE, а не save(entity) — строка пишется по разу на страницу,
   * read-modify-write здесь не нужен.
   */
  async save(nextPage: number, searchText: string): Promise<void> {
    try {
      await this.position.update(
        { id: VACANCY_SCAN_POSITION_SINGLETON_ID },
        { nextPage, searchText },
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);

      this.logger.warn(`${VACANCY_SCAN_POSITION_SAVE_FAILED_MESSAGE}: ${reason}`);
    }
  }

  /** Сброс позиции — выдача исчерпана (§4.11.12), следующий запуск начнётся со страницы 0. Тоже не бросает. */
  async clear(): Promise<void> {
    try {
      await this.position.update(
        { id: VACANCY_SCAN_POSITION_SINGLETON_ID },
        { nextPage: VACANCY_SCAN_INITIAL_PAGE, searchText: null },
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);

      this.logger.warn(`${VACANCY_SCAN_POSITION_SAVE_FAILED_MESSAGE}: ${reason}`);
    }
  }
}
