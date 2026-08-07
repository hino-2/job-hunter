import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { COLUMN_TYPE, PRIMARY_KEY_STRATEGY } from '../database/database.constants';
import {
  APPLICATION_COLUMN,
  APPLICATION_INDEX,
  APPLICATIONS_TABLE,
  COMPANY_MAX_LENGTH,
  DEFAULT_APPLICATION_RESULT,
  DEFAULT_APPLICATION_STATUS,
  HH_VACANCY_ID_COLUMN_LENGTH,
  HH_VACANCY_TYPE_COLUMN_LENGTH,
  POSITION_MAX_LENGTH,
  RESULT_COLUMN_LENGTH,
  STATUS_COLUMN_LENGTH,
  SYNC_OUTCOME_COLUMN_LENGTH,
} from './applications.constants';
import type { ApplicationWritableFields } from './applications.interfaces';
import type { ApplicationResult, ApplicationStatus, SyncOutcome } from './applications.type';

/**
 * Таблица applications (§3.1). Схема создаётся миграциями, synchronize выключен —
 * декораторы здесь нужны ORM для маппинга и служат эталоном для migration:generate,
 * поэтому имена колонок и индексов обязаны совпадать с миграцией.
 *
 * Маппинг snake_case ↔ camelCase — только через явный `name` в каждой колонке,
 * без кастомной NamingStrategy.
 */
@Entity({ name: APPLICATIONS_TABLE })
export class Application implements ApplicationWritableFields {
  @PrimaryGeneratedColumn(PRIMARY_KEY_STRATEGY, { name: APPLICATION_COLUMN.ID })
  id!: string;

  @Column({
    type: COLUMN_TYPE.VARCHAR,
    name: APPLICATION_COLUMN.COMPANY,
    length: COMPANY_MAX_LENGTH,
  })
  company!: string;

  @Column({
    type: COLUMN_TYPE.VARCHAR,
    name: APPLICATION_COLUMN.POSITION,
    length: POSITION_MAX_LENGTH,
    nullable: true,
  })
  position!: string | null;

  @Column({ type: COLUMN_TYPE.TEXT, name: APPLICATION_COLUMN.VACANCY_URL, nullable: true })
  vacancyUrl!: string | null;

  @Column({ type: COLUMN_TYPE.TEXT, name: APPLICATION_COLUMN.RESUME_URL, nullable: true })
  resumeUrl!: string | null;

  @Index(APPLICATION_INDEX.STATUS)
  @Column({
    type: COLUMN_TYPE.VARCHAR,
    name: APPLICATION_COLUMN.STATUS,
    length: STATUS_COLUMN_LENGTH,
    default: DEFAULT_APPLICATION_STATUS,
  })
  status!: ApplicationStatus;

  @Column({
    type: COLUMN_TYPE.VARCHAR,
    name: APPLICATION_COLUMN.RESULT,
    length: RESULT_COLUMN_LENGTH,
    default: DEFAULT_APPLICATION_RESULT,
  })
  result!: ApplicationResult;

  @Column({ type: COLUMN_TYPE.TEXT, name: APPLICATION_COLUMN.EMPLOYER_CONTACT, nullable: true })
  employerContact!: string | null;

  @Column({
    type: COLUMN_TYPE.TIMESTAMPTZ,
    name: APPLICATION_COLUMN.HR_INTERVIEW_AT,
    nullable: true,
  })
  hrInterviewAt!: Date | null;

  @Column({
    type: COLUMN_TYPE.TIMESTAMPTZ,
    name: APPLICATION_COLUMN.TECH_INTERVIEW_AT,
    nullable: true,
  })
  techInterviewAt!: Date | null;

  @Column({ type: COLUMN_TYPE.TEXT, name: APPLICATION_COLUMN.NOTES, nullable: true })
  notes!: string | null;

  @Column({
    type: COLUMN_TYPE.VARCHAR,
    name: APPLICATION_COLUMN.HH_VACANCY_ID,
    length: HH_VACANCY_ID_COLUMN_LENGTH,
    nullable: true,
  })
  hhVacancyId!: string | null;

  @Column({ type: COLUMN_TYPE.BOOLEAN, name: APPLICATION_COLUMN.HH_ARCHIVED, nullable: true })
  hhArchived!: boolean | null;

  /** Намеренно string, а не union: hh.ru может завести новое значение type.id. */
  @Column({
    type: COLUMN_TYPE.VARCHAR,
    name: APPLICATION_COLUMN.HH_VACANCY_TYPE,
    length: HH_VACANCY_TYPE_COLUMN_LENGTH,
    nullable: true,
  })
  hhVacancyType!: string | null;

  @Column({
    type: COLUMN_TYPE.TIMESTAMPTZ,
    name: APPLICATION_COLUMN.LAST_SYNCED_AT,
    nullable: true,
  })
  lastSyncedAt!: Date | null;

  @Column({
    type: COLUMN_TYPE.VARCHAR,
    name: APPLICATION_COLUMN.LAST_SYNC_OUTCOME,
    length: SYNC_OUTCOME_COLUMN_LENGTH,
    nullable: true,
  })
  lastSyncOutcome!: SyncOutcome | null;

  @Column({ type: COLUMN_TYPE.TEXT, name: APPLICATION_COLUMN.LAST_SYNC_ERROR, nullable: true })
  lastSyncError!: string | null;

  @Index(APPLICATION_INDEX.CREATED_AT)
  @CreateDateColumn({ type: COLUMN_TYPE.TIMESTAMPTZ, name: APPLICATION_COLUMN.CREATED_AT })
  createdAt!: Date;

  /** Обновляет ORM при каждом save(), триггера в БД нет. */
  @UpdateDateColumn({ type: COLUMN_TYPE.TIMESTAMPTZ, name: APPLICATION_COLUMN.UPDATED_AT })
  updatedAt!: Date;
}
