import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Таблица vacancy_leads (§3.5): вакансии-кандидаты, найденные поиском по hh.ru
 * (§4.11) — независима от applications, внешнего ключа между таблицами нет и не
 * будет. UNIQUE (company_key, position_key, published_on) материализует правило
 * дедупликации §4.11.5 — вставка новых лидов идёт INSERT ... ON CONFLICT DO NOTHING,
 * и это единственная защита от гонки ручного и планового прогонов. Индекс по
 * published_on DESC — сортировка списка по умолчанию (§5.7).
 *
 * ОСОЗНАННОЕ ИСКЛЮЧЕНИЕ из §10 п.3 («никаких литералов в имплементационных файлах»):
 * миграция — неизменяемый снимок схемы на конкретный момент. Если подставить сюда
 * константы модуля (VACANCY_LEADS_TABLE, VACANCY_LEAD_COLUMN, …), то любое будущее
 * переименование колонки задним числом перепишет уже применённую историю и разъедется
 * с реальной БД. Поэтому SQL здесь пишется литералами и только литералами.
 *
 * gen_random_uuid() входит в ядро PostgreSQL с версии 13, CREATE EXTENSION не нужен.
 * Уникальности по external_id нет намеренно (§3.5): одна и та же вакансия публикуется
 * отдельным ID на каждый регион hh.ru.
 */
export class CreateVacancyLeadsTable1786700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "vacancy_leads" (
        "id"                     uuid NOT NULL DEFAULT gen_random_uuid(),
        "source"                 character varying(16) NOT NULL DEFAULT 'HH',
        "external_id"            character varying(32) NOT NULL,
        "position"               character varying(255) NOT NULL,
        "company"                character varying(255) NOT NULL,
        "position_key"           character varying(255) NOT NULL,
        "company_key"            character varying(255) NOT NULL,
        "published_on"           date NOT NULL,
        "published_at"           timestamptz,
        "vacancy_url"            text NOT NULL,
        "area_name"              character varying(128),
        "salary_from"            integer,
        "salary_to"              integer,
        "salary_currency"        character varying(8),
        "salary_gross"           boolean,
        "experience"             character varying(32),
        "employment_form"        character varying(32),
        "work_formats"           character varying(64),
        "matched_keywords"       text,
        "match_source"           character varying(16) NOT NULL DEFAULT 'KEYWORDS',
        "ai_model"               character varying(64),
        "ai_title_reason"        character varying(500),
        "ai_description_reason"  character varying(500),
        "hidden_at"              timestamptz,
        "first_seen_at"          timestamptz NOT NULL DEFAULT now(),
        "last_seen_at"           timestamptz NOT NULL DEFAULT now(),
        "created_at"             timestamptz NOT NULL DEFAULT now(),
        "updated_at"             timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_vacancy_leads" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_vacancy_leads_dedup_key" UNIQUE ("company_key", "position_key", "published_on")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_vacancy_leads_published_on" ON "vacancy_leads" ("published_on" DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_vacancy_leads_published_on"`);
    await queryRunner.query(`DROP TABLE "vacancy_leads"`);
  }
}
