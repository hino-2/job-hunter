import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Чинит расхождение, оставленное дефектным down() миграции
 * 1786300000000-GeneralizeVacancySource: цикл revert→up на записях с getmatch-ссылкой
 * в vacancy_url оставлял getmatch-шный vacancy_external_id при vacancy_source = 'HH'
 * (backfill 1 той миграции безусловно помечал любой непустой vacancy_external_id как 'HH').
 * Синхронизация в результате диспетчеризовалась на hh.ru и затирала запись чужой вакансией
 * (position, vacancy_archived, status = CLOSED, last_sync_*).
 *
 * Ремонт — один UPDATE. Все выражения SET читают старые значения строки, поэтому в одном
 * операторе можно одновременно переderive-ить vacancy_source/vacancy_external_id из URL
 * и решить по прежнему last_sync_outcome/vacancy_archived, нужно ли откатывать position
 * и status. Идемпотентность бесплатна: после первого прогона WHERE (vacancy_source
 * IS DISTINCT FROM 'GETMATCH') перестаёт матчить починенные строки.
 *
 * ОСОЗНАННОЕ ИСКЛЮЧЕНИЕ из §10 п.3 («никаких литералов в имплементационных файлах»):
 * миграция — неизменяемый снимок схемы на конкретный момент. Если подставить сюда
 * константы модуля, то любое будущее переименование колонки задним числом перепишет
 * уже применённую историю и разъедется с реальной БД. Поэтому SQL здесь пишется
 * литералами и только литералами.
 *
 * down() пустой: это ремонт данных, испорченных чужим дефектом, а не обратимая миграция
 * схемы — откатывать репарацию к заведомо неверному состоянию смысла нет.
 */
export class RepairGetmatchVacancySource1786400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "applications"
         SET "vacancy_source" = 'GETMATCH',
             "vacancy_external_id" = substring("vacancy_url" from
               '(?:https?://)?(?:www\\.)?getmatch\\.ru/vacancies/(\\d{1,32})'),
             "vacancy_archived" = NULL,
             "last_synced_at" = NULL,
             "last_sync_outcome" = NULL,
             "last_sync_error" = NULL,
             "position" = CASE
               WHEN "last_sync_outcome" = 'OK' THEN NULL
               ELSE "position"
             END,
             "status" = CASE
               WHEN "status" = 'CLOSED'
                AND ("last_sync_outcome" = 'NOT_FOUND'
                     OR ("last_sync_outcome" = 'OK' AND "vacancy_archived" IS TRUE))
               THEN 'OPEN'
               ELSE "status"
             END
       WHERE "vacancy_source" IS DISTINCT FROM 'GETMATCH'
         AND "vacancy_url" ~* '^\\s*(?:https?://)?(?:www\\.)?getmatch\\.ru/vacancies/\\d{1,32}(?:-[^/?#]*)?/?(?:[?#].*)?\\s*$'
    `);
  }

  public down(): Promise<void> {
    return Promise.resolve();
  }
}
