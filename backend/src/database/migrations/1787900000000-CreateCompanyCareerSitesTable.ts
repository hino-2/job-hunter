import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Таблица company_career_sites (§3.8, §4.14): редактируемый список сайтов компаний —
 * четвёртый источник поиска лидов (COMPANY_SITE), page прогона = индекс строки в
 * порядке name ASC, id ASC (CompanyCareerSitesService.findByIndex). Ни индексов сверх
 * PK, ни уникальности на name/url — задача не допускать дублей лежит на пользователе,
 * а строки не участвуют в FK ни с одной другой таблицей (§3.5: у vacancy_leads нет
 * ссылки на company_career_sites, лиды переживают удаление строки).
 *
 * Плюс строка vacancy_scan_position для source = 'COMPANY_SITE' — по тому же приёму,
 * что и предыдущие AddVacancyScanPositionSource/AddGeekjobSearchSource: таблица уже
 * ключуется по source, вставляется недостающая строка с next_page = 0.
 *
 * ОСОЗНАННОЕ ИСКЛЮЧЕНИЕ из §10 п.3 («никаких литералов в имплементационных файлах»):
 * миграция — неизменяемый снимок схемы и данных на конкретный момент, см. подробное
 * обоснование в CreateVacancyLeadsTable. gen_random_uuid() входит в ядро PostgreSQL
 * с версии 13, CREATE EXTENSION не нужен.
 *
 * down() отменяет ровно то, что добавил up(): удаляет строку позиции COMPANY_SITE и
 * дропает таблицу целиком — засев живёт только в ней, откат полностью отменяет up()
 * (тот же урок, что не был учтён в GeneralizeVacancySource).
 */
export class CreateCompanyCareerSitesTable1787900000000 implements MigrationInterface {
  private readonly seedRows: ReadonlyArray<readonly [string, string]> = [
    [
      'Ozon',
      'https://ekaterinburg.hh.ru/search/vacancy?hhtmFrom=vacancy_search_list&hhtmFromLabel=drawer_filter&search_field=name&search_field=company_name&search_field=description&enable_snippets=false&hhtmSource=vacancy_search_list&hhtmSourceLabel=vacancy_search_list&L_save_area=true&text=ozon&professional_role=96',
    ],
    [
      'Папа Джонс',
      'https://ekaterinburg.hh.ru/search/vacancy?text=%D0%9F%D0%B0%D0%BF%D0%B0%20%D0%94%D0%B6%D0%BE%D0%BD%D1%81&search_field=company_name&professional_role=96&L_save_area=true',
    ],
    [
      'Fix Price',
      'https://ekaterinburg.hh.ru/search/vacancy?text=Fix%20Price&search_field=company_name&professional_role=96&L_save_area=true',
    ],
    [
      'Лента',
      'https://ekaterinburg.hh.ru/search/vacancy?employer_id=7172&professional_role=96&L_save_area=true',
    ],
    ['Контур', 'https://kontur.ru/career/vacancies'],
    ['X5 Tech', 'https://x5.tech/vacancy'],
    ['Авиасейлз', 'https://www.aviasales.ru/about/vacancies'],
    ['РЖД', 'https://team.rzd.ru/career/vacancies/it_innovations'],
    ['Wildberries', 'https://career.rwb.ru/vacancies'],
    ['Магнит Тех', 'https://magnit.tech/vacancies'],
    ['Додо', 'https://dodoteam.ru/vacancies'],
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "company_career_sites" (
        "id"         uuid NOT NULL DEFAULT gen_random_uuid(),
        "name"       character varying(255) NOT NULL,
        "url"        character varying(2048) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_company_career_sites" PRIMARY KEY ("id")
      )
    `);

    const params: string[] = [];
    const valuesSql = this.seedRows
      .map(([name, url]) => {
        params.push(name, url);

        return `($${params.length - 1}, $${params.length})`;
      })
      .join(', ');

    await queryRunner.query(
      `INSERT INTO "company_career_sites" ("name", "url") VALUES ${valuesSql}`,
      params,
    );

    await queryRunner.query(
      `INSERT INTO "vacancy_scan_position" ("source", "next_page", "search_url_template")
       VALUES ($1, $2, $3)
       ON CONFLICT ("source") DO NOTHING`,
      ['COMPANY_SITE', 0, null],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "vacancy_scan_position" WHERE "source" = $1`, [
      'COMPANY_SITE',
    ]);

    await queryRunner.query(`DROP TABLE "company_career_sites"`);
  }
}
