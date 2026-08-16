import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Колонка vacancy_search_settings.search_url_template (§3.6/§4.11.1/§5.7): шаблон
 * ссылки на выдачу hh.ru становится пользовательской настройкой, а не значением
 * env HH_SEARCH_URL_TEMPLATE (которое эта же правка убирает из схемы окружения).
 *
 * Три отдельных шага, а не одна колонка с DDL DEFAULT: строка настроек уже
 * существует (засеяна CreateVacancySearchSettingsTable), поэтому (a) колонка
 * добавляется nullable, (b) существующая строка засевается тем же дефолтным
 * шаблоном §4.11.1, параметризованным UPDATE (b), (c) колонка переводится
 * в NOT NULL. DDL DEFAULT не оставляем — иначе migration:generate против сущности
 * (у которой @Column без default) увидел бы расхождение и предложил его снять.
 *
 * ОСОЗНАННОЕ ИСКЛЮЧЕНИЕ из §10 п.3 («никаких литералов в имплементационных файлах»):
 * миграция — неизменяемый снимок данных на конкретный момент, см. подробное
 * обоснование в CreateVacancyLeadsTable.
 *
 * down() дропает колонку целиком — засев живёт только в ней, поэтому откат
 * полностью отменяет up(). Cикл revert → up ДЕТЕРМИНИРОВАННО возвращает дефолтный
 * шаблон и теряет правку пользователя, если та была внесена между двумя прогонами —
 * тот же компромисс, что уже принят у остальных полей этой таблицы.
 */
export class AddVacancySearchUrlTemplate1787100000000 implements MigrationInterface {
  private readonly defaultTemplate =
    'https://ekaterinburg.hh.ru/search/vacancy?text={text}&salary=&ored_clusters=true' +
    '&work_schedule_by_days=FIVE_ON_TWO_OFF&order_by=publication_time&page={page}';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vacancy_search_settings" ADD "search_url_template" character varying(2048)`,
    );

    await queryRunner.query(
      `UPDATE "vacancy_search_settings"
         SET "search_url_template" = $1
       WHERE "search_url_template" IS NULL`,
      [this.defaultTemplate],
    );

    await queryRunner.query(
      `ALTER TABLE "vacancy_search_settings" ALTER COLUMN "search_url_template" SET NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "vacancy_search_settings" DROP COLUMN "search_url_template"`);
  }
}
