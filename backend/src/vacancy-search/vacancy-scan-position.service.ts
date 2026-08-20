import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { VacancySource } from '../applications/applications.type';
import { VacancyScanPosition } from './vacancy-scan-position.entity';
import {
  VACANCY_SCAN_INITIAL_PAGE,
  VACANCY_SCAN_POSITION_MISSING_MESSAGE,
  VACANCY_SCAN_POSITION_SAVE_FAILED_MESSAGE,
} from './vacancy-search.constants';
import type { VacancyScanPositionSnapshot } from './vacancy-search.interfaces';

/**
 * §3.7: сохранённые позиции прогона поиска — по строке на источник. Строки засевают
 * миграции (CreateVacancyScanPositionTable, AddVacancyScanPositionSource) — сервис их
 * НЕ создаёт (тот же принцип, что у VacancySearchSettingsService.find()): второй путь
 * появления данных означал бы гонку на старте. Отсутствие строки — повреждение схемы,
 * а не штатный случай.
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

  /** Бросает 500, если строки источника нет: её создаёт миграция, второй путь появления данных запрещён (§3.7). */
  async load(source: VacancySource): Promise<VacancyScanPositionSnapshot> {
    const entity = await this.position.findOneBy({ source });

    if (entity === null) {
      this.logger.error(
        `Строка позиции прогона поиска вакансий для источника ${source} отсутствует в БД: ` +
          'миграция не выполнена или строка удалена вручную',
      );

      throw new InternalServerErrorException(VACANCY_SCAN_POSITION_MISSING_MESSAGE);
    }

    return {
      source: entity.source,
      nextPage: entity.nextPage,
      searchUrlTemplate: entity.searchUrlTemplate,
    };
  }

  /**
   * §5.7: все позиции сразу — GET .../scan/status отдаёт доступность «Продолжить» по
   * каждому источнику, и делать по запросу на источник смысла нет. Отсутствие строки
   * здесь НЕ ошибка: источник без строки просто не получит «Продолжить», статус —
   * не то место, где стоит падать пятисоткой.
   */
  async loadAll(): Promise<VacancyScanPositionSnapshot[]> {
    const entities = await this.position.find();

    return entities.map((entity) => ({
      source: entity.source,
      nextPage: entity.nextPage,
      searchUrlTemplate: entity.searchUrlTemplate,
    }));
  }

  /**
   * Никогда не бросает наружу — сбой записи позиции не должен ронять прогон.
   * Узкий UPDATE, а не save(entity) — строка пишется по разу на страницу,
   * read-modify-write здесь не нужен.
   */
  async save(source: VacancySource, nextPage: number, searchUrlTemplate: string): Promise<void> {
    try {
      await this.position.update({ source }, { nextPage, searchUrlTemplate });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);

      this.logger.warn(`${VACANCY_SCAN_POSITION_SAVE_FAILED_MESSAGE}: ${reason}`);
    }
  }

  /** Сброс позиции источника — выдача исчерпана (§4.11.12), следующий запуск начнётся со страницы 0. Тоже не бросает. */
  async clear(source: VacancySource): Promise<void> {
    try {
      await this.position.update(
        { source },
        { nextPage: VACANCY_SCAN_INITIAL_PAGE, searchUrlTemplate: null },
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);

      this.logger.warn(`${VACANCY_SCAN_POSITION_SAVE_FAILED_MESSAGE}: ${reason}`);
    }
  }
}
