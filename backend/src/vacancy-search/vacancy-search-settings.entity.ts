import { Check, Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

import { COLUMN_TYPE } from '../database/database.constants';
import {
  VACANCY_SEARCH_SETTINGS_COLUMN,
  VACANCY_SEARCH_SETTINGS_ID_CHECK,
  VACANCY_SEARCH_SETTINGS_SEARCH_URL_TEMPLATE_LENGTH,
  VACANCY_SEARCH_SETTINGS_SINGLETON_ID,
  VACANCY_SEARCH_SETTINGS_TABLE,
} from './vacancy-search.constants';

/**
 * Таблица vacancy_search_settings (§3.6): настройки поиска, которые пользователь
 * правит на фронте (§7.9), а не в .env. Ровно одна строка — id smallint с
 * CHECK (id = 1); строка создаётся самой миграцией
 * (CreateVacancySearchSettingsTable), а не кодом при первом обращении, поэтому
 * сервис, читающий настройки, не обязан уметь их создавать.
 *
 * Схема создаётся миграциями, synchronize выключен — декораторы здесь служат
 * эталоном для migration:generate, имена колонок и CHECK обязаны совпадать с
 * миграцией.
 */
@Entity({ name: VACANCY_SEARCH_SETTINGS_TABLE })
@Check(VACANCY_SEARCH_SETTINGS_ID_CHECK, `"id" = ${VACANCY_SEARCH_SETTINGS_SINGLETON_ID}`)
export class VacancySearchSettings {
  @PrimaryColumn({
    type: COLUMN_TYPE.SMALLINT,
    name: VACANCY_SEARCH_SETTINGS_COLUMN.ID,
    default: VACANCY_SEARCH_SETTINGS_SINGLETON_ID,
  })
  id!: number;

  /**
   * §3.6/§4.11.1/§5.7: шаблон ссылки на выдачу hh.ru — обычная колонка, а не env.
   * Поисковый запрос — часть самой ссылки (свой text=… у пользователя), плейсхолдер
   * обязателен только один — {page}; хост — из allow-list hh.ru (проверяется при
   * PUT и, ещё раз fail-loud, при чтении снимка на старте прогона).
   */
  @Column({
    type: COLUMN_TYPE.VARCHAR,
    name: VACANCY_SEARCH_SETTINGS_COLUMN.SEARCH_URL_TEMPLATE,
    length: VACANCY_SEARCH_SETTINGS_SEARCH_URL_TEMPLATE_LENGTH,
  })
  searchUrlTemplate!: string;

  /**
   * §3.6/§4.11.1/§5.7: шаблон ссылки на выдачу it-vacancies.ru — своя колонка, а не
   * общая с hh.ru: у источников свой синтаксис запроса, фильтров и пагинации, одним
   * шаблоном они не выражаются. Требования те же: обязателен плейсхолдер {page},
   * хост — из allow-list it-vacancies.ru.
   */
  @Column({
    type: COLUMN_TYPE.VARCHAR,
    name: VACANCY_SEARCH_SETTINGS_COLUMN.IT_VACANCIES_SEARCH_URL_TEMPLATE,
    length: VACANCY_SEARCH_SETTINGS_SEARCH_URL_TEMPLATE_LENGTH,
  })
  itVacanciesSearchUrlTemplate!: string;

  /** §4.11.4: ключевые слова через запятую — и для детерминированного отбора, и для промптов. */
  @Column({ type: COLUMN_TYPE.TEXT, name: VACANCY_SEARCH_SETTINGS_COLUMN.KEYWORDS })
  keywords!: string;

  /** §4.11.4: стоп-слова через запятую. */
  @Column({
    type: COLUMN_TYPE.TEXT,
    name: VACANCY_SEARCH_SETTINGS_COLUMN.EXCLUDE_KEYWORDS,
    nullable: true,
  })
  excludeKeywords!: string | null;

  /** §4.12.2: промпт этапа 1 — оценка названия вакансии. */
  @Column({ type: COLUMN_TYPE.TEXT, name: VACANCY_SEARCH_SETTINGS_COLUMN.TITLE_PROMPT })
  titlePrompt!: string;

  /** §4.12.2: промпт этапа 4 — оценка описания вакансии. */
  @Column({ type: COLUMN_TYPE.TEXT, name: VACANCY_SEARCH_SETTINGS_COLUMN.DESCRIPTION_PROMPT })
  descriptionPrompt!: string;

  /** §4.12: выключен — работает только детерминированный отбор по ключевым словам. */
  @Column({
    type: COLUMN_TYPE.BOOLEAN,
    name: VACANCY_SEARCH_SETTINGS_COLUMN.AI_ENABLED,
    default: false,
  })
  aiEnabled!: boolean;

  @UpdateDateColumn({
    type: COLUMN_TYPE.TIMESTAMPTZ,
    name: VACANCY_SEARCH_SETTINGS_COLUMN.UPDATED_AT,
  })
  updatedAt!: Date;
}
