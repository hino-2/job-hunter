import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * geekjob.ru — четвёртый источник (§4.8, §4.11, §4.13). Одна миграция, два смежных
 * концерна, единый чистый откат:
 *
 * 1. Колонка vacancy_search_settings.geekjob_search_url_template — по тому же
 *    приёму, что AddItVacanciesSearchUrlTemplate: строка настроек уже существует
 *    (засеяна CreateVacancySearchSettingsTable), поэтому (a) колонка добавляется
 *    nullable, (b) существующая строка засевается дефолтным шаблоном
 *    параметризованным UPDATE, (c) колонка переводится в NOT NULL. DDL DEFAULT не
 *    оставляем — иначе migration:generate против сущности (у которой @Column без
 *    default) увидел бы расхождение и предложил его снять.
 * 2. Строка vacancy_scan_position для source = 'GEEKJOB' — по тому же приёму, что
 *    AddVacancyScanPositionSource добавил строку 'IT_VACANCIES': таблица уже
 *    ключуется по source (не singleton), просто вставляется недостающая строка.
 *
 * ОСОЗНАННОЕ ИСКЛЮЧЕНИЕ из §10 п.3 («никаких литералов в имплементационных файлах»):
 * миграция — неизменяемый снимок данных на конкретный момент, см. подробное
 * обоснование в CreateVacancyLeadsTable.
 *
 * down() отменяет ровно то, что добавил up(): удаляет строку позиции geekjob и
 * дропает колонку целиком — засев живёт только в ней, поэтому откат полностью
 * отменяет up() (тот же урок, что не был учтён в GeneralizeVacancySource и
 * потребовал RepairGetmatchVacancySource).
 */
export class AddGeekjobSearchSource1787700000000 implements MigrationInterface {
  private readonly defaultTemplate = 'https://geekjob.ru/vacancies?rm=1&qs=node&page={page}';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vacancy_search_settings" ADD "geekjob_search_url_template" character varying(2048)`,
    );

    await queryRunner.query(
      `UPDATE "vacancy_search_settings"
         SET "geekjob_search_url_template" = $1
       WHERE "geekjob_search_url_template" IS NULL`,
      [this.defaultTemplate],
    );

    await queryRunner.query(
      `ALTER TABLE "vacancy_search_settings" ALTER COLUMN "geekjob_search_url_template" SET NOT NULL`,
    );

    await queryRunner.query(
      `INSERT INTO "vacancy_scan_position" ("source", "next_page", "search_url_template")
       VALUES ($1, $2, $3)
       ON CONFLICT ("source") DO NOTHING`,
      ['GEEKJOB', 0, null],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "vacancy_scan_position" WHERE "source" = $1`, ['GEEKJOB']);

    await queryRunner.query(
      `ALTER TABLE "vacancy_search_settings" DROP COLUMN "geekjob_search_url_template"`,
    );
  }
}
