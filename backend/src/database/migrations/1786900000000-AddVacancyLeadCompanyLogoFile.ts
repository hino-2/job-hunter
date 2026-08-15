import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Добавляет колонку company_logo_file (§3.5, §4.10, §4.11, шаг №26 §14) — имя файла
 * логотипа компании на диске (каталог COMPANY_LOGO_DIR), тот же механизм, что уже
 * есть у applications (AddApplicationCompanyLogoFile1786613753333). nullable,
 * backfill'а нет: уже существующие лиды логотипа не получают, поле заполняется
 * только при вставке новой строки сканом.
 *
 * ОСОЗНАННОЕ ИСКЛЮЧЕНИЕ из §10 п.3 («никаких литералов в имплементационных файлах»):
 * миграция — неизменяемый снимок схемы на конкретный момент. Если подставить сюда
 * константы модуля (VACANCY_LEADS_TABLE, VACANCY_LEAD_COLUMN, …), то любое будущее
 * переименование колонки задним числом перепишет уже применённую историю и разъедется
 * с реальной БД. Поэтому SQL здесь пишется литералами и только литералами.
 */
export class AddVacancyLeadCompanyLogoFile1786900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vacancy_leads" ADD "company_logo_file" character varying(64)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "vacancy_leads" DROP COLUMN "company_logo_file"`);
  }
}
