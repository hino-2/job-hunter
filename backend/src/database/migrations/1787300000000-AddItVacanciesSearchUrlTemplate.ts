import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Колонка vacancy_search_settings.it_vacancies_search_url_template (§3.6/§4.11.1/§5.7):
 * второй источник поиска лидов (it-vacancies.ru) получает свой шаблон ссылки на
 * выдачу — одна настройка на источник, потому что запрос, фильтры и пагинация у
 * источников свои и общим шаблоном не выражаются.
 *
 * Три отдельных шага, а не одна колонка с DDL DEFAULT — ровно тот же приём, что в
 * AddVacancySearchUrlTemplate: строка настроек уже существует (засеяна
 * CreateVacancySearchSettingsTable), поэтому (a) колонка добавляется nullable,
 * (b) существующая строка засевается дефолтным шаблоном параметризованным UPDATE,
 * (c) колонка переводится в NOT NULL. DDL DEFAULT не оставляем — иначе
 * migration:generate против сущности (у которой @Column без default) увидел бы
 * расхождение и предложил его снять.
 *
 * ОСОЗНАННОЕ ИСКЛЮЧЕНИЕ из §10 п.3 («никаких литералов в имплементационных файлах»):
 * миграция — неизменяемый снимок данных на конкретный момент, см. подробное
 * обоснование в CreateVacancyLeadsTable.
 *
 * down() дропает колонку целиком — засев живёт только в ней, поэтому откат
 * полностью отменяет up().
 */
export class AddItVacanciesSearchUrlTemplate1787300000000 implements MigrationInterface {
  private readonly defaultTemplate =
    'https://it-vacancies.ru/vacancies/?search_field=node.js&page={page}';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vacancy_search_settings" ADD "it_vacancies_search_url_template" character varying(2048)`,
    );

    await queryRunner.query(
      `UPDATE "vacancy_search_settings"
         SET "it_vacancies_search_url_template" = $1
       WHERE "it_vacancies_search_url_template" IS NULL`,
      [this.defaultTemplate],
    );

    await queryRunner.query(
      `ALTER TABLE "vacancy_search_settings" ALTER COLUMN "it_vacancies_search_url_template" SET NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vacancy_search_settings" DROP COLUMN "it_vacancies_search_url_template"`,
    );
  }
}
