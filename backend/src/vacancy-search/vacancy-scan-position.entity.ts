import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

import { VACANCY_SOURCE_COLUMN_LENGTH } from '../applications/applications.constants';
import type { VacancySource } from '../applications/applications.type';
import { COLUMN_TYPE } from '../database/database.constants';
import {
  VACANCY_SCAN_POSITION_COLUMN,
  VACANCY_SCAN_POSITION_SEARCH_URL_TEMPLATE_LENGTH,
  VACANCY_SCAN_POSITION_TABLE,
} from './vacancy-search.constants';

/**
 * Таблица vacancy_scan_position (§3.7): позиция прогона поиска, на которой
 * продолжает работать «Продолжить» (§4.11.12) — переживает рестарт процесса,
 * в отличие от VacancyScanStateService (только память, §4.11.9).
 *
 * По строке на источник поиска лидов: PK — сам source, а не искусственный id с
 * CHECK (id = 1), как было до появления второго источника. Прогон всё равно идёт
 * один за раз (§4.11.9), но продолжать прогон hh.ru с позиции it-vacancies.ru
 * нельзя, поэтому позиции хранятся раздельно. Строки засевают миграции
 * (CreateVacancyScanPositionTable и AddVacancyScanPositionSource), сервис их не
 * создаёт.
 *
 * Machine-written данные, поэтому таблица не совмещена с vacancy_search_settings
 * (пользовательский ресурс, целиком заменяемый PUT) — см. обоснование в §3.7.
 *
 * Схема создаётся миграциями, synchronize выключен — декораторы здесь служат
 * эталоном для migration:generate, имена колонок обязаны совпадать с миграцией.
 */
@Entity({ name: VACANCY_SCAN_POSITION_TABLE })
export class VacancyScanPosition {
  /** Тот же enum VacancySource, что у applications.vacancy_source и vacancy_leads.source (§4.8). */
  @PrimaryColumn({
    type: COLUMN_TYPE.VARCHAR,
    name: VACANCY_SCAN_POSITION_COLUMN.SOURCE,
    length: VACANCY_SOURCE_COLUMN_LENGTH,
  })
  source!: VacancySource;

  /** §4.11.12: 0-based абсолютный номер следующей необработанной страницы выдачи. */
  @Column({
    type: COLUMN_TYPE.INTEGER,
    name: VACANCY_SCAN_POSITION_COLUMN.NEXT_PAGE,
    default: 0,
  })
  nextPage!: number;

  /** §4.11.12: ссылка на выдачу, при которой позиция была сохранена — «Продолжить»
   *  доступно, только пока она совпадает с текущими настройками. null — прогонов ещё не было. */
  @Column({
    type: COLUMN_TYPE.VARCHAR,
    name: VACANCY_SCAN_POSITION_COLUMN.SEARCH_URL_TEMPLATE,
    length: VACANCY_SCAN_POSITION_SEARCH_URL_TEMPLATE_LENGTH,
    nullable: true,
  })
  searchUrlTemplate!: string | null;

  @UpdateDateColumn({
    type: COLUMN_TYPE.TIMESTAMPTZ,
    name: VACANCY_SCAN_POSITION_COLUMN.UPDATED_AT,
  })
  updatedAt!: Date;
}
