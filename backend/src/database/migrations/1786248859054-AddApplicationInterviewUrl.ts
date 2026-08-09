import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Добавляет колонку interview_url (§3.1) — ссылку на созвон по тех. собеседованию
 * (Google Meet, Zoom и т. п.), nullable, сразу после resume_url по смыслу поля.
 *
 * ОСОЗНАННОЕ ИСКЛЮЧЕНИЕ из §10 п.3 («никаких литералов в имплементационных файлах»):
 * миграция — неизменяемый снимок схемы на конкретный момент. Если подставить сюда
 * константы модуля (APPLICATIONS_TABLE, APPLICATION_COLUMN, …), то любое будущее
 * переименование колонки задним числом перепишет уже применённую историю и разъедется
 * с реальной БД. Поэтому SQL здесь пишется литералами и только литералами.
 */
export class AddApplicationInterviewUrl1786248859054 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "applications" ADD "interview_url" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "applications" DROP COLUMN "interview_url"`);
  }
}
