import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * §3.2: до этого шага status = 'OPEN' покрывал и записи, у которых уже назначено
 * собеседование — новые значения HR_INTERVIEW/TECH_INTERVIEW бэкенд с этого момента
 * выводит из hr_interview_at/tech_interview_at на каждой записи (см.
 * application-status.helpers.ts), но уже существующие строки этот код не трогает,
 * пока их не откроют на PATCH. Миграция один раз досчитывает то же правило по данным,
 * которые уже лежат в таблице.
 *
 * Порядок важен: сперва TECH_INTERVIEW (перебивает независимо от hr_interview_at),
 * затем HR_INTERVIEW только для тех, кого первый UPDATE не затронул (tech_interview_at
 * IS NULL) — тот же приоритет, что в deriveInterviewStatus.
 *
 * WHERE status = 'OPEN' — правки не трогает ни CLOSED (терминальный результат/снятая
 * вакансия важнее), ни уже проставленные HR_INTERVIEW/TECH_INTERVIEW (идемпотентность).
 *
 * ОСОЗНАННОЕ ИСКЛЮЧЕНИЕ из §10 п.3, как и в остальных миграциях: SQL здесь — литералы,
 * а не константы модуля (см. RepairGetmatchVacancySource).
 */
export class BackfillInterviewApplicationStatuses1787600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "applications"
         SET "status" = 'TECH_INTERVIEW'
       WHERE "status" = 'OPEN'
         AND "tech_interview_at" IS NOT NULL
    `);

    await queryRunner.query(`
      UPDATE "applications"
         SET "status" = 'HR_INTERVIEW'
       WHERE "status" = 'OPEN'
         AND "hr_interview_at" IS NOT NULL
         AND "tech_interview_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "applications"
         SET "status" = 'OPEN'
       WHERE "status" IN ('HR_INTERVIEW', 'TECH_INTERVIEW')
    `);
  }
}
