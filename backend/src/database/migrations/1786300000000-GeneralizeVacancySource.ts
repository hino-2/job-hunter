import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Обобщает интеграцию до понятия «источник вакансии» (§4.8): переименовывает
 * hh-специфичные колонки, добавляет vacancy_source и переводит SKIPPED_NOT_HH
 * в SKIPPED_UNSUPPORTED. hh_vacancy_type удаляется целиком — колонка никогда
 * не заполнялась (страница вакансии hh.ru не отдаёт type.id), а у getmatch
 * аналога нет.
 *
 * ОСОЗНАННОЕ ИСКЛЮЧЕНИЕ из §10 п.3 («никаких литералов в имплементационных файлах»):
 * миграция — неизменяемый снимок схемы на конкретный момент. Если подставить сюда
 * константы модуля, то любое будущее переименование колонки задним числом перепишет
 * уже применённую историю и разъедется с реальной БД. Поэтому SQL здесь пишется
 * литералами и только литералами.
 */
export class GeneralizeVacancySource1786300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "applications" RENAME COLUMN "hh_vacancy_id" TO "vacancy_external_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "applications" RENAME COLUMN "hh_archived" TO "vacancy_archived"`,
    );
    await queryRunner.query(`ALTER TABLE "applications" DROP COLUMN "hh_vacancy_type"`);
    await queryRunner.query(
      `ALTER TABLE "applications" ADD "vacancy_source" character varying(16)`,
    );

    // Backfill 1: непустой внешний ID мог быть записан только hh-парсером —
    // на момент этой миграции другого источника ещё не существовало.
    await queryRunner.query(
      `UPDATE "applications" SET "vacancy_source" = 'HH' WHERE "vacancy_external_id" IS NOT NULL`,
    );

    // Backfill 2 (best effort): ссылки на getmatch, введённые до появления источника.
    // Регекс — одноразовый снимок паттерна getmatch-url.parser.ts; промах безвреден,
    // запись просто останется без источника до следующей правки vacancy_url.
    await queryRunner.query(`
      UPDATE "applications"
         SET "vacancy_source" = 'GETMATCH',
             "vacancy_external_id" = substring("vacancy_url" from
               '(?:https?://)?(?:www\\.)?getmatch\\.ru/vacancies/(\\d{1,32})')
       WHERE "vacancy_source" IS NULL
         AND "vacancy_url" ~* '^\\s*(?:https?://)?(?:www\\.)?getmatch\\.ru/vacancies/\\d{1,32}(?:-[^/?#]*)?/?(?:[?#].*)?\\s*$'
    `);

    await queryRunner.query(
      `UPDATE "applications" SET "last_sync_outcome" = 'SKIPPED_UNSUPPORTED'` +
        ` WHERE "last_sync_outcome" = 'SKIPPED_NOT_HH'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // До этой миграции колонка hh_vacancy_id у getmatch-ссылки всегда была NULL
    // (источника getmatch тогда не существовало), поэтому откат обязан вернуть NULL —
    // иначе после DROP COLUMN ниже останется getmatch-шный id без источника,
    // и повторный up() backfill-ом 1 пометит его источником 'HH'.
    await queryRunner.query(
      `UPDATE "applications" SET "vacancy_external_id" = NULL WHERE "vacancy_source" = 'GETMATCH'`,
    );
    await queryRunner.query(
      `UPDATE "applications" SET "last_sync_outcome" = 'SKIPPED_NOT_HH'` +
        ` WHERE "last_sync_outcome" = 'SKIPPED_UNSUPPORTED'`,
    );
    await queryRunner.query(`ALTER TABLE "applications" DROP COLUMN "vacancy_source"`);
    await queryRunner.query(
      `ALTER TABLE "applications" ADD "hh_vacancy_type" character varying(32)`,
    );
    await queryRunner.query(
      `ALTER TABLE "applications" RENAME COLUMN "vacancy_archived" TO "hh_archived"`,
    );
    await queryRunner.query(
      `ALTER TABLE "applications" RENAME COLUMN "vacancy_external_id" TO "hh_vacancy_id"`,
    );
  }
}
