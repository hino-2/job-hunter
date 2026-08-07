import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Первая миграция: таблица applications (§3.1) — 19 колонок, PK по id,
 * индексы по status и created_at DESC.
 *
 * ОСОЗНАННОЕ ИСКЛЮЧЕНИЕ из §10 п.3 («никаких литералов в имплементационных файлах»):
 * миграция — неизменяемый снимок схемы на конкретный момент. Если подставить сюда
 * константы модуля (APPLICATIONS_TABLE, APPLICATION_COLUMN, …), то любое будущее
 * переименование колонки задним числом перепишет уже применённую историю и разъедется
 * с реальной БД. Поэтому SQL здесь пишется литералами и только литералами.
 *
 * gen_random_uuid() входит в ядро PostgreSQL с версии 13, CREATE EXTENSION не нужен.
 * Уникальности по hh_vacancy_id нет намеренно (§3.1): на одну вакансию можно
 * откликнуться дважды разными резюме.
 * updated_at обновляет ORM (@UpdateDateColumn), триггер не создаём.
 */
export class CreateApplicationsTable1786033566571 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "applications" (
        "id"                uuid NOT NULL DEFAULT gen_random_uuid(),
        "company"           character varying(255) NOT NULL,
        "position"          character varying(255),
        "vacancy_url"       text,
        "resume_url"        text,
        "status"            character varying(16) NOT NULL DEFAULT 'OPEN',
        "result"            character varying(32) NOT NULL DEFAULT 'IN_PROGRESS',
        "employer_contact"  text,
        "hr_interview_at"   timestamptz,
        "tech_interview_at" timestamptz,
        "notes"             text,
        "hh_vacancy_id"     character varying(32),
        "hh_archived"       boolean,
        "hh_vacancy_type"   character varying(32),
        "last_synced_at"    timestamptz,
        "last_sync_outcome" character varying(32),
        "last_sync_error"   text,
        "created_at"        timestamptz NOT NULL DEFAULT now(),
        "updated_at"        timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_applications" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_applications_status" ON "applications" ("status")`);
    await queryRunner.query(
      `CREATE INDEX "IDX_applications_created_at" ON "applications" ("created_at" DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_applications_created_at"`);
    await queryRunner.query(`DROP INDEX "IDX_applications_status"`);
    await queryRunner.query(`DROP TABLE "applications"`);
  }
}
