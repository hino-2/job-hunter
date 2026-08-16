import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Таблица vacancy_scan_position (§3.7): сохранённая позиция прогона поиска —
 * «Продолжить» (§4.11.12) читает её, чтобы возобновить прогон с той же страницы
 * после рестарта процесса, потому что VacancyScanStateService держит статус
 * только в памяти (§4.11.9). Ровно одна строка — id smallint с CHECK (id = 1),
 * тот же приём, что у vacancy_search_settings (CreateVacancySearchSettingsTable):
 * строка сразу засевается этой же миграцией (INSERT ... ON CONFLICT DO NOTHING),
 * а не кодом при первом обращении — сервис, читающий позицию, не обязан уметь
 * её создавать, иначе появился бы второй путь появления данных и гонка на старте.
 *
 * ОСОЗНАННОЕ ИСКЛЮЧЕНИЕ из §10 п.3 («никаких литералов в имплементационных файлах»):
 * миграция — неизменяемый снимок схемы на конкретный момент, см. подробное
 * обоснование в CreateVacancyLeadsTable.
 *
 * down() дропает таблицу целиком, а значит и засеянную строку — миграция
 * откатывает собственный засев тем же способом, каким его сделала (тот же урок,
 * что не был учтён в GeneralizeVacancySource и потребовал RepairGetmatchVacancySource:
 * down() обязан убирать именно то, что добавил up(), иначе цикл revert→up портит данные).
 */
export class CreateVacancyScanPositionTable1787000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "vacancy_scan_position" (
        "id"          smallint NOT NULL DEFAULT 1,
        "next_page"   integer NOT NULL DEFAULT 0,
        "search_text" character varying(512),
        "updated_at"  timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_vacancy_scan_position" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_vacancy_scan_position_id" CHECK ("id" = 1)
      )
    `);

    await queryRunner.query(
      `INSERT INTO "vacancy_scan_position" ("id", "next_page", "search_text")
       VALUES ($1, $2, $3)
       ON CONFLICT ("id") DO NOTHING`,
      [1, 0, null],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "vacancy_scan_position"`);
  }
}
