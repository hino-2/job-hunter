import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Добавляет колонку company_logo_file (§3.1, §4.10) — имя файла логотипа компании
 * на диске (каталог COMPANY_LOGO_DIR), а не URL и не байты; nullable, backfill'а нет:
 * существующие записи получают логотип при следующей синхронизации.
 *
 * ОСОЗНАННОЕ ИСКЛЮЧЕНИЕ из §10 п.3 («никаких литералов в имплементационных файлах»):
 * миграция — неизменяемый снимок схемы на конкретный момент. Если подставить сюда
 * константы модуля (APPLICATIONS_TABLE, APPLICATION_COLUMN, …), то любое будущее
 * переименование колонки задним числом перепишет уже применённую историю и разъедется
 * с реальной БД. Поэтому SQL здесь пишется литералами и только литералами.
 */
export class AddApplicationCompanyLogoFile1786613753333 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "applications" ADD "company_logo_file" character varying(64)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "applications" DROP COLUMN "company_logo_file"`);
  }
}
