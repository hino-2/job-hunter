import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

import { VACANCY_SOURCE } from '../applications/applications.constants';
import type { VacancySource } from '../applications/applications.type';
import { COLUMN_TYPE, PRIMARY_KEY_STRATEGY } from '../database/database.constants';
import { COMPANY_LOGO_FILE_COLUMN_LENGTH } from '../logos/company-logo.constants';
import {
  DEFAULT_MATCH_SOURCE,
  VACANCY_LEAD_AI_MODEL_LENGTH,
  VACANCY_LEAD_AI_REASON_LENGTH,
  VACANCY_LEAD_AREA_NAME_LENGTH,
  VACANCY_LEAD_COLUMN,
  VACANCY_LEAD_COMPANY_KEY_LENGTH,
  VACANCY_LEAD_COMPANY_LENGTH,
  VACANCY_LEAD_EMPLOYMENT_FORM_LENGTH,
  VACANCY_LEAD_EXPERIENCE_LENGTH,
  VACANCY_LEAD_EXTERNAL_ID_LENGTH,
  VACANCY_LEAD_INDEX,
  VACANCY_LEAD_MATCH_SOURCE_LENGTH,
  VACANCY_LEAD_POSITION_KEY_LENGTH,
  VACANCY_LEAD_POSITION_LENGTH,
  VACANCY_LEAD_SALARY_CURRENCY_LENGTH,
  VACANCY_LEAD_SOURCE_LENGTH,
  VACANCY_LEAD_WORK_FORMATS_LENGTH,
  VACANCY_LEADS_TABLE,
} from './vacancy-search.constants';
import type { MatchSource } from './vacancy-search.type';

/**
 * Таблица vacancy_leads (§3.5): вакансии-кандидаты, найденные поиском по hh.ru
 * (§4.11), независимые от applications — внешнего ключа между таблицами нет и не
 * будет (§3.5). Схема создаётся миграциями, synchronize выключен — декораторы здесь
 * служат эталоном для migration:generate, поэтому имена колонок и индексов обязаны
 * совпадать с миграцией CreateVacancyLeadsTable.
 *
 * Колонки description намеренно нет (§3.5): описание уходит модели (§4.11.7),
 * но не сохраняется — читать его пользователь будет на источнике по ссылке.
 *
 * source использует тот же enum VacancySource, что и applications.vacancy_source
 * (§4.8) — источник вакансии один и тот же концепт в обеих таблицах.
 */
@Entity({ name: VACANCY_LEADS_TABLE })
@Unique(VACANCY_LEAD_INDEX.DEDUP_KEY, ['companyKey', 'positionKey', 'publishedOn'])
export class VacancyLead {
  @PrimaryGeneratedColumn(PRIMARY_KEY_STRATEGY, { name: VACANCY_LEAD_COLUMN.ID })
  id!: string;

  @Column({
    type: COLUMN_TYPE.VARCHAR,
    name: VACANCY_LEAD_COLUMN.SOURCE,
    length: VACANCY_LEAD_SOURCE_LENGTH,
    default: VACANCY_SOURCE.HH,
  })
  source!: VacancySource;

  @Column({
    type: COLUMN_TYPE.VARCHAR,
    name: VACANCY_LEAD_COLUMN.EXTERNAL_ID,
    length: VACANCY_LEAD_EXTERNAL_ID_LENGTH,
  })
  externalId!: string;

  @Column({
    type: COLUMN_TYPE.VARCHAR,
    name: VACANCY_LEAD_COLUMN.POSITION,
    length: VACANCY_LEAD_POSITION_LENGTH,
  })
  position!: string;

  @Column({
    type: COLUMN_TYPE.VARCHAR,
    name: VACANCY_LEAD_COLUMN.COMPANY,
    length: VACANCY_LEAD_COMPANY_LENGTH,
  })
  company!: string;

  /** §4.11.5: нормализованная должность — часть ключа дедупликации. */
  @Column({
    type: COLUMN_TYPE.VARCHAR,
    name: VACANCY_LEAD_COLUMN.POSITION_KEY,
    length: VACANCY_LEAD_POSITION_KEY_LENGTH,
  })
  positionKey!: string;

  /** §4.11.5: нормализованная компания — часть ключа дедупликации. */
  @Column({
    type: COLUMN_TYPE.VARCHAR,
    name: VACANCY_LEAD_COLUMN.COMPANY_KEY,
    length: VACANCY_LEAD_COMPANY_KEY_LENGTH,
  })
  companyKey!: string;

  /**
   * §4.11.6: дата из ISO-строки как есть, без пересчёта часовых поясов — часть
   * ключа дедупликации. Колонка `date` в Postgres маппится TypeORM на строку
   * `YYYY-MM-DD`, а не на Date — пересчёт таймзоны здесь означал бы ту самую
   * ошибку, которой §4.11.6 требует избежать.
   */
  @Index(VACANCY_LEAD_INDEX.PUBLISHED_ON)
  @Column({ type: COLUMN_TYPE.DATE, name: VACANCY_LEAD_COLUMN.PUBLISHED_ON })
  publishedOn!: string;

  @Column({ type: COLUMN_TYPE.TIMESTAMPTZ, name: VACANCY_LEAD_COLUMN.PUBLISHED_AT, nullable: true })
  publishedAt!: Date | null;

  @Column({ type: COLUMN_TYPE.TEXT, name: VACANCY_LEAD_COLUMN.VACANCY_URL })
  vacancyUrl!: string;

  @Column({
    type: COLUMN_TYPE.VARCHAR,
    name: VACANCY_LEAD_COLUMN.AREA_NAME,
    length: VACANCY_LEAD_AREA_NAME_LENGTH,
    nullable: true,
  })
  areaName!: string | null;

  @Column({ type: COLUMN_TYPE.INTEGER, name: VACANCY_LEAD_COLUMN.SALARY_FROM, nullable: true })
  salaryFrom!: number | null;

  @Column({ type: COLUMN_TYPE.INTEGER, name: VACANCY_LEAD_COLUMN.SALARY_TO, nullable: true })
  salaryTo!: number | null;

  @Column({
    type: COLUMN_TYPE.VARCHAR,
    name: VACANCY_LEAD_COLUMN.SALARY_CURRENCY,
    length: VACANCY_LEAD_SALARY_CURRENCY_LENGTH,
    nullable: true,
  })
  salaryCurrency!: string | null;

  @Column({ type: COLUMN_TYPE.BOOLEAN, name: VACANCY_LEAD_COLUMN.SALARY_GROSS, nullable: true })
  salaryGross!: boolean | null;

  @Column({
    type: COLUMN_TYPE.VARCHAR,
    name: VACANCY_LEAD_COLUMN.EXPERIENCE,
    length: VACANCY_LEAD_EXPERIENCE_LENGTH,
    nullable: true,
  })
  experience!: string | null;

  @Column({
    type: COLUMN_TYPE.VARCHAR,
    name: VACANCY_LEAD_COLUMN.EMPLOYMENT_FORM,
    length: VACANCY_LEAD_EMPLOYMENT_FORM_LENGTH,
    nullable: true,
  })
  employmentForm!: string | null;

  /** §5.7: наружу уходит массивом, хранится строкой через запятую. */
  @Column({
    type: COLUMN_TYPE.VARCHAR,
    name: VACANCY_LEAD_COLUMN.WORK_FORMATS,
    length: VACANCY_LEAD_WORK_FORMATS_LENGTH,
    nullable: true,
  })
  workFormats!: string | null;

  /** §5.7: наружу уходит массивом, хранится строкой через запятую. */
  @Column({ type: COLUMN_TYPE.TEXT, name: VACANCY_LEAD_COLUMN.MATCHED_KEYWORDS, nullable: true })
  matchedKeywords!: string | null;

  @Column({
    type: COLUMN_TYPE.VARCHAR,
    name: VACANCY_LEAD_COLUMN.MATCH_SOURCE,
    length: VACANCY_LEAD_MATCH_SOURCE_LENGTH,
    default: DEFAULT_MATCH_SOURCE,
  })
  matchSource!: MatchSource;

  @Column({
    type: COLUMN_TYPE.VARCHAR,
    name: VACANCY_LEAD_COLUMN.AI_MODEL,
    length: VACANCY_LEAD_AI_MODEL_LENGTH,
    nullable: true,
  })
  aiModel!: string | null;

  @Column({
    type: COLUMN_TYPE.VARCHAR,
    name: VACANCY_LEAD_COLUMN.AI_TITLE_REASON,
    length: VACANCY_LEAD_AI_REASON_LENGTH,
    nullable: true,
  })
  aiTitleReason!: string | null;

  @Column({
    type: COLUMN_TYPE.VARCHAR,
    name: VACANCY_LEAD_COLUMN.AI_DESCRIPTION_REASON,
    length: VACANCY_LEAD_AI_REASON_LENGTH,
    nullable: true,
  })
  aiDescriptionReason!: string | null;

  /**
   * §4.10, §4.11: имя файла логотипа на диске (каталог COMPANY_LOGO_DIR), тот же
   * механизм, что у applications.company_logo_file — качается один раз, при вставке
   * лида скана (шаг №26 §14), а не при каждом повторном прогоне.
   */
  @Column({
    type: COLUMN_TYPE.VARCHAR,
    name: VACANCY_LEAD_COLUMN.COMPANY_LOGO_FILE,
    length: COMPANY_LOGO_FILE_COLUMN_LENGTH,
    nullable: true,
  })
  companyLogoFile!: string | null;

  /** §3.5, §5.7: null — видима. Удаления нет, только скрытие. */
  @Column({ type: COLUMN_TYPE.TIMESTAMPTZ, name: VACANCY_LEAD_COLUMN.HIDDEN_AT, nullable: true })
  hiddenAt!: Date | null;

  @Column({
    type: COLUMN_TYPE.TIMESTAMPTZ,
    name: VACANCY_LEAD_COLUMN.FIRST_SEEN_AT,
    default: () => 'now()',
  })
  firstSeenAt!: Date;

  /** §4.11.5: обновляется на каждом дубликате, встреченном повторным прогоном. */
  @Column({
    type: COLUMN_TYPE.TIMESTAMPTZ,
    name: VACANCY_LEAD_COLUMN.LAST_SEEN_AT,
    default: () => 'now()',
  })
  lastSeenAt!: Date;

  @CreateDateColumn({ type: COLUMN_TYPE.TIMESTAMPTZ, name: VACANCY_LEAD_COLUMN.CREATED_AT })
  createdAt!: Date;

  /** Обновляет ORM при каждом save(), триггера в БД нет. */
  @UpdateDateColumn({ type: COLUMN_TYPE.TIMESTAMPTZ, name: VACANCY_LEAD_COLUMN.UPDATED_AT })
  updatedAt!: Date;
}
