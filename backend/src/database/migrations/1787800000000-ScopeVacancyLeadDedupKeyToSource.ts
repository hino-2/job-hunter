import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * §4.11.5: убирает кросс-источниковый дедуп — ключ дедупликации vacancy_leads расширяется
 * с тройки (company_key, position_key, published_on) до четвёрки с source первым
 * компонентом, так что одна и та же вакансия, опубликованная на hh.ru и на geekjob.ru,
 * впредь остаётся ДВУМЯ отдельными лидами, а не одним.
 *
 * up() меняет только схему: старый уникальный индекс гарантировал уникальность тройки
 * ГЛОБАЛЬНО (по всем источникам), поэтому каждая существующая строка тривиально уникальна
 * и на более широкой четвёрке — расширение уникального ключа новым ведущим столбцом не
 * может конфликтовать с уже вставленными строками, данные не трогаются.
 *
 * down() вынужденно лоссовый: сузить ключ обратно значит восстановить старый инвариант
 * («тройка уникальна глобально»), а после up() на проде вполне могут появиться настоящие
 * кросспост-дубликаты по тройке — их придётся удалить, оставив по одной строке на тройку
 * (более раннюю по first_seen_at/id), только потом воссоздавать старый 3-колоночный индекс.
 *
 * ОСОЗНАННОЕ ИСКЛЮЧЕНИЕ из §10 п.3 («никаких литералов в имплементационных файлах»):
 * миграция — неизменяемый снимок данных на конкретный момент, см. подробное обоснование
 * в CreateVacancyLeadsTable.
 */
export class ScopeVacancyLeadDedupKeyToSource1787800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vacancy_leads" DROP CONSTRAINT "UQ_vacancy_leads_dedup_key"`,
    );

    await queryRunner.query(
      `ALTER TABLE "vacancy_leads"
         ADD CONSTRAINT "UQ_vacancy_leads_dedup_key"
         UNIQUE ("source", "company_key", "position_key", "published_on")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Сначала восстанавливаем инвариант «тройка уникальна глобально» — оставляем в каждой
    // группе (company_key, position_key, published_on) только самую раннюю строку
    // (first_seen_at, id), остальные (кросспост-копии, появившиеся после up()) удаляем.
    await queryRunner.query(
      `DELETE FROM "vacancy_leads" v USING "vacancy_leads" keep
        WHERE v."company_key" = keep."company_key" AND v."position_key" = keep."position_key"
          AND v."published_on" = keep."published_on"
          AND (keep."first_seen_at", keep."id") < (v."first_seen_at", v."id")`,
    );

    await queryRunner.query(
      `ALTER TABLE "vacancy_leads" DROP CONSTRAINT "UQ_vacancy_leads_dedup_key"`,
    );

    await queryRunner.query(
      `ALTER TABLE "vacancy_leads"
         ADD CONSTRAINT "UQ_vacancy_leads_dedup_key"
         UNIQUE ("company_key", "position_key", "published_on")`,
    );
  }
}
