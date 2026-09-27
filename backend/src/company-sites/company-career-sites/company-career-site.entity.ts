import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { COMPANY_MAX_LENGTH, URL_MAX_LENGTH } from '../../applications/applications.constants';
import { COLUMN_TYPE, PRIMARY_KEY_STRATEGY } from '../../database/database.constants';
import { COMPANY_CAREER_SITE_COLUMN, COMPANY_CAREER_SITES_TABLE } from '../company-sites.constants';

/**
 * Таблица company_career_sites (§3.8): строки редактируемого списка «Сайты компаний»
 * (§7.9) — CRUD ресурса /api/company-career-sites (§5.9), провайдер COMPANY_SITE читает
 * их по индексу (CompanyCareerSitesService.findByIndex, §4.14). Схема создаётся
 * миграциями, synchronize выключен — декораторы здесь служат эталоном для
 * migration:generate, имена колонок обязаны совпадать с CreateCompanyCareerSitesTable.
 *
 * Ни индексов сверх PK, ни уникальности на name/url (§3.8) — строки хранятся как есть,
 * задача пользователя не допускать дублей руками. Удаление — жёсткое, лиды не хранят
 * FK на эту таблицу (§3.5) и продолжают существовать после удаления строки.
 */
@Entity({ name: COMPANY_CAREER_SITES_TABLE })
export class CompanyCareerSite {
  @PrimaryGeneratedColumn(PRIMARY_KEY_STRATEGY, { name: COMPANY_CAREER_SITE_COLUMN.ID })
  id!: string;

  @Column({
    type: COLUMN_TYPE.VARCHAR,
    name: COMPANY_CAREER_SITE_COLUMN.NAME,
    length: COMPANY_MAX_LENGTH,
  })
  name!: string;

  @Column({
    type: COLUMN_TYPE.VARCHAR,
    name: COMPANY_CAREER_SITE_COLUMN.URL,
    length: URL_MAX_LENGTH,
  })
  url!: string;

  @CreateDateColumn({ type: COLUMN_TYPE.TIMESTAMPTZ, name: COMPANY_CAREER_SITE_COLUMN.CREATED_AT })
  createdAt!: Date;

  @UpdateDateColumn({ type: COLUMN_TYPE.TIMESTAMPTZ, name: COMPANY_CAREER_SITE_COLUMN.UPDATED_AT })
  updatedAt!: Date;
}
