import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Восстановление кириллицы в vacancy_search_settings.
 *
 * В рабочей базе строка настроек оказалась засеяна текстом, в котором каждый
 * кириллический символ заменён на U+FFFD: `exclude_keywords`, `title_prompt`
 * и `description_prompt` состояли из «ромбиков», ASCII-части (плейсхолдеры,
 * `1С`→`1C`, `php`, `java`) уцелели. Прогон миграций на чистой базе с нынешними
 * артефактами даёт корректный текст, то есть виноват не сид, а разовый запуск
 * старой сборки, где исходник миграции читался не как UTF-8. Само по себе это
 * не сломало бы ничего заметного — ИИ просто получал бы промпт из «ромбиков»
 * и отбирал вакансии наугад, а стоп-слова с кириллицей («стажёр») не срабатывали бы.
 *
 * Условие `position(U&'\FFFD' in ...) > 0` обязательно: промпты редактируются
 * пользователем (§7.9.4), и безусловный UPDATE затёр бы правку. По той же причине
 * `title_prompt` восстанавливается сразу в редакции §4.12.2 (уточнённой, см.
 * SharpenVacancyTitlePrompt) — прежняя редакция здесь уже неактуальна.
 *
 * down() намеренно пуст: единственное, что он мог бы «вернуть», — испорченный
 * текст, а это не откат, а повторная порча. Обратной операции у починки нет.
 *
 * ОСОЗНАННОЕ ИСКЛЮЧЕНИЕ из §10 п.3 («никаких литералов в имплементационных файлах»):
 * миграция — неизменяемый снимок данных на конкретный момент, см. подробное
 * обоснование в CreateVacancyLeadsTable.
 */
export class RepairVacancySearchSettingsEncoding1786800000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const titlePrompt =
      'Ты помогаешь отбирать вакансии для разработчика. Ключевые слова профиля: {keywords}.\n' +
      'Подходит только тот, кто сам пишет код продукта: разработчик, программист, developer, engineer.\n' +
      'Отклоняй любые другие специальности, даже если в названии есть слово fullstack:\n' +
      'тестировщика и QA, аналитика (системного, бизнес, любого), менеджера, дизайнера,\n' +
      'devops, преподавателя, руководителя без разработки.\n' +
      'Разработчик подходит и тогда, когда его основной язык другой, но в названии есть\n' +
      'React, Node.js, TypeScript или JavaScript.\n' +
      'Разработчик подходит, если название не уточняет стек вовсе.\n' +
      'Названия:\n' +
      '{titles}\n' +
      'Ответь JSON-массивом по одному объекту на каждое название, в том же порядке.';

    const descriptionPrompt =
      'Ты помогаешь отбирать вакансии. Ключевые слова профиля: {keywords}.\n' +
      'Вакансия: {title} в компании {company}.\n' +
      'Описание:\n' +
      '{description}\n' +
      'Реши, действительно ли эта вакансия соответствует профилю: нужны ли в ней перечисленные\n' +
      'технологии как основные, а не упомянуты вскользь. Ответь JSON-объектом.';

    await queryRunner.query(
      `UPDATE "vacancy_search_settings"
         SET "title_prompt" = $1
       WHERE position(U&'\\FFFD' in "title_prompt") > 0`,
      [titlePrompt],
    );

    await queryRunner.query(
      `UPDATE "vacancy_search_settings"
         SET "description_prompt" = $1
       WHERE position(U&'\\FFFD' in "description_prompt") > 0`,
      [descriptionPrompt],
    );

    await queryRunner.query(
      `UPDATE "vacancy_search_settings"
         SET "exclude_keywords" = $1
       WHERE "exclude_keywords" IS NOT NULL
         AND position(U&'\\FFFD' in "exclude_keywords") > 0`,
      ['1С, 1C, php, java, стажёр, стажер, junior'],
    );
  }

  public async down(): Promise<void> {
    // Пусто осознанно — см. комментарий к классу.
  }
}
