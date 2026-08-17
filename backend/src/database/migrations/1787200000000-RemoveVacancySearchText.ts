import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Читает строковую колонку из строки БД, не размечая тип строки заранее (§10 п.4: unknown на границе). */
function readColumn(row: unknown, column: string): string | null {
  if (typeof row !== 'object' || row === null) {
    return null;
  }

  const value = (row as Record<string, unknown>)[column];

  return typeof value === 'string' ? value : null;
}

/**
 * Убирает search_text отовсюду (§4.11.1, §5.7): поисковый запрос теперь — часть
 * самой ссылки на выдачу (search_url_template), а не отдельное поле, которое
 * подставлялось в плейсхолдер {text}. Единственный оставшийся плейсхолдер — {page}.
 *
 * up() СНАЧАЛА сворачивает search_text в шаблон (первое вхождение {text}
 * заменяется на encodeURIComponent(search_text) — те же семантика и порядок, что у
 * старого buildHhSearchUrl), и только потом дропает обе колонки — иначе значение
 * поискового запроса было бы потеряно безвозвратно. Свёртка необратима: после неё
 * ничто не помнит, какая подстрока URL была текстом поиска, поэтому down() её не
 * повторяет, а лишь восстанавливает засеянные значения (search_text = 'fullstack',
 * search_url_template из AddVacancySearchUrlTemplate уже удалён этой же миграцией
 * и здесь не восстанавливается — им управляет только та миграция).
 *
 * Ровно поэтому цикл revert → up идемпотентен на search_url_template: во второй
 * up() строка снова не содержит {text} (в ней уже подставлено значение), поэтому
 * шаг свёртки просто ничего не меняет — тот же компромисс, что и в
 * AddVacancySearchUrlTemplate.down() (детерминированный, но теряющий пользовательскую
 * правку между двумя прогонами, если бы она была).
 *
 * vacancy_scan_position.search_text переносится в новую колонку
 * search_url_template (а не переименовывается на месте — RENAME COLUMN оставил бы
 * varchar(512), а туда пишется значение шириной до 2048, что дало бы тихий обрез
 * при первом же save()), и только тогда, когда сохранённая позиция была ещё
 * валидна ДО этой миграции (её search_text совпадал с текущим search_text
 * настроек) — иначе перенос молча продолжил бы прогон по неверной выдаче.
 *
 * ОСОЗНАННОЕ ИСКЛЮЧЕНИЕ из §10 п.3 («никаких литералов в имплементационных файлах»):
 * миграция — неизменяемый снимок данных на конкретный момент, см. подробное
 * обоснование в CreateVacancyLeadsTable.
 */
export class RemoveVacancySearchText1787200000000 implements MigrationInterface {
  private readonly seedSearchText = 'fullstack';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const rows: unknown = await queryRunner.query(
      `SELECT "search_text", "search_url_template" FROM "vacancy_search_settings" WHERE "id" = 1`,
    );
    const row: unknown = Array.isArray(rows) ? (rows as unknown[])[0] : undefined;
    const searchText = readColumn(row, 'search_text');
    const searchUrlTemplate = readColumn(row, 'search_url_template');
    let foldedTemplate: string | null = null;

    if (searchText !== null && searchUrlTemplate !== null) {
      foldedTemplate = searchUrlTemplate.replace('{text}', encodeURIComponent(searchText));

      await queryRunner.query(
        `UPDATE "vacancy_search_settings" SET "search_url_template" = $1 WHERE "id" = 1`,
        [foldedTemplate],
      );
    }

    await queryRunner.query(
      `ALTER TABLE "vacancy_scan_position" ADD "search_url_template" character varying(2048)`,
    );

    if (foldedTemplate !== null) {
      await queryRunner.query(
        `UPDATE "vacancy_scan_position" p
            SET "search_url_template" = $1
           FROM "vacancy_search_settings" s
          WHERE p."id" = 1
            AND s."id" = 1
            AND p."search_text" IS NOT NULL
            AND p."search_text" = s."search_text"`,
        [foldedTemplate],
      );
    }

    await queryRunner.query(`ALTER TABLE "vacancy_scan_position" DROP COLUMN "search_text"`);
    await queryRunner.query(`ALTER TABLE "vacancy_search_settings" DROP COLUMN "search_text"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "vacancy_search_settings" ADD "search_text" character varying(512)`);
    await queryRunner.query(
      `UPDATE "vacancy_search_settings" SET "search_text" = $1 WHERE "search_text" IS NULL`,
      [this.seedSearchText],
    );
    await queryRunner.query(
      `ALTER TABLE "vacancy_search_settings" ALTER COLUMN "search_text" SET NOT NULL`,
    );

    await queryRunner.query(`ALTER TABLE "vacancy_scan_position" ADD "search_text" character varying(512)`);
    await queryRunner.query(`ALTER TABLE "vacancy_scan_position" DROP COLUMN "search_url_template"`);
  }
}
