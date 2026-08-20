import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * vacancy_scan_position перестаёт быть singleton-таблицей (§3.7, §4.11.12): PK
 * переезжает с искусственного id на source, то есть по строке на источник поиска
 * лидов. Причина — прогон идёт по одному источнику за раз, но сохранённая позиция
 * у каждого источника своя: «Продолжить» для it-vacancies.ru не должно продолжать
 * прогон hh.ru и наоборот.
 *
 * ОСОЗНАННОЕ ИСКЛЮЧЕНИЕ из §10 п.3 («никаких литералов в имплементационных файлах»):
 * миграция — неизменяемый снимок схемы на конкретный момент, см. подробное
 * обоснование в CreateVacancyLeadsTable.
 *
 * Порядок шагов up() обязателен: колонка source сначала добавляется nullable и
 * засевается ('HH' — существующая строка могла быть только позицией hh.ru, другого
 * источника поиска до этой правки не существовало), только потом становится NOT NULL
 * и PK. Дропнуть старый PK можно лишь после снятия CHECK по id — иначе Postgres
 * оставил бы проверку на удалённой колонке.
 *
 * down() убирает ровно то, что добавил up(), включая собственный засев строки
 * IT_VACANCIES: без DELETE восстановленный singleton-PK по id столкнулся бы с двумя
 * строками, у которых id одинаковый (DEFAULT 1). Тот же урок, который не был учтён
 * в GeneralizeVacancySource и потребовал RepairGetmatchVacancySource. Цикл
 * revert → up идемпотентен: у выжившей строки hh сохраняются next_page и
 * search_url_template, up() снова помечает её как 'HH', строка it-vacancies
 * пересевается пустой.
 */
export class AddVacancyScanPositionSource1787400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vacancy_scan_position" ADD "source" character varying(16)`,
    );

    await queryRunner.query(
      `UPDATE "vacancy_scan_position" SET "source" = $1 WHERE "source" IS NULL`,
      ['HH'],
    );

    await queryRunner.query(
      `ALTER TABLE "vacancy_scan_position" ALTER COLUMN "source" SET NOT NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE "vacancy_scan_position" DROP CONSTRAINT "CHK_vacancy_scan_position_id"`,
    );

    await queryRunner.query(
      `ALTER TABLE "vacancy_scan_position" DROP CONSTRAINT "PK_vacancy_scan_position"`,
    );

    await queryRunner.query(`ALTER TABLE "vacancy_scan_position" DROP COLUMN "id"`);

    await queryRunner.query(
      `ALTER TABLE "vacancy_scan_position"
         ADD CONSTRAINT "PK_vacancy_scan_position" PRIMARY KEY ("source")`,
    );

    await queryRunner.query(
      `INSERT INTO "vacancy_scan_position" ("source", "next_page", "search_url_template")
       VALUES ($1, $2, $3)
       ON CONFLICT ("source") DO NOTHING`,
      ['IT_VACANCIES', 0, null],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "vacancy_scan_position" WHERE "source" <> $1`, ['HH']);

    await queryRunner.query(
      `ALTER TABLE "vacancy_scan_position" DROP CONSTRAINT "PK_vacancy_scan_position"`,
    );

    await queryRunner.query(`ALTER TABLE "vacancy_scan_position" DROP COLUMN "source"`);

    await queryRunner.query(
      `ALTER TABLE "vacancy_scan_position" ADD "id" smallint NOT NULL DEFAULT 1`,
    );

    await queryRunner.query(
      `ALTER TABLE "vacancy_scan_position"
         ADD CONSTRAINT "PK_vacancy_scan_position" PRIMARY KEY ("id")`,
    );

    await queryRunner.query(
      `ALTER TABLE "vacancy_scan_position"
         ADD CONSTRAINT "CHK_vacancy_scan_position_id" CHECK ("id" = 1)`,
    );

    await queryRunner.query(
      `INSERT INTO "vacancy_scan_position" ("id", "next_page", "search_url_template")
       VALUES ($1, $2, $3)
       ON CONFLICT ("id") DO NOTHING`,
      [1, 0, null],
    );
  }
}
