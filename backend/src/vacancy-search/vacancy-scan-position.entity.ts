import { Check, Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

import { COLUMN_TYPE } from '../database/database.constants';
import {
  VACANCY_SCAN_POSITION_COLUMN,
  VACANCY_SCAN_POSITION_ID_CHECK,
  VACANCY_SCAN_POSITION_SEARCH_URL_TEMPLATE_LENGTH,
  VACANCY_SCAN_POSITION_SINGLETON_ID,
  VACANCY_SCAN_POSITION_TABLE,
} from './vacancy-search.constants';

/**
 * Таблица vacancy_scan_position (§3.7): позиция прогона поиска, на которой
 * продолжает работать «Продолжить» (§4.11.12) — переживает рестарт процесса,
 * в отличие от VacancyScanStateService (только память, §4.11.9). Ровно одна
 * строка — id smallint с CHECK (id = 1), тот же приём, что у
 * vacancy_search_settings, строку засевает миграция
 * (CreateVacancyScanPositionTable), сервис её не создаёт.
 *
 * Machine-written данные, поэтому таблица не совмещена с vacancy_search_settings
 * (пользовательский ресурс, целиком заменяемый PUT) — см. обоснование в §3.7.
 *
 * Схема создаётся миграциями, synchronize выключен — декораторы здесь служат
 * эталоном для migration:generate, имена колонок и CHECK обязаны совпадать с
 * миграцией.
 */
@Entity({ name: VACANCY_SCAN_POSITION_TABLE })
@Check(VACANCY_SCAN_POSITION_ID_CHECK, `"id" = ${VACANCY_SCAN_POSITION_SINGLETON_ID}`)
export class VacancyScanPosition {
  @PrimaryColumn({
    type: COLUMN_TYPE.SMALLINT,
    name: VACANCY_SCAN_POSITION_COLUMN.ID,
    default: VACANCY_SCAN_POSITION_SINGLETON_ID,
  })
  id!: number;

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
