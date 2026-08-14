import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Таблица vacancy_search_settings (§3.6): настройки поиска, которые пользователь
 * правит на фронте (§7.9), а не в .env. Ровно одна строка — id smallint с
 * CHECK (id = 1); строка сразу засевается этой же миграцией (INSERT ... ON CONFLICT
 * DO NOTHING), а не кодом при первом обращении — сервис, читающий настройки, не
 * обязан уметь их создавать, иначе появился бы второй путь появления данных и гонка
 * на старте. ai_enabled = false в сиде обязателен: гарантирует, что e2e не ходит
 * в ollama, пока кто-то явно не включит ИИ на фронте.
 *
 * Дефолтные промпты — дословно из §4.12.2, переданы параметрами запроса, а не
 * конкатенацией строки (защита от случайной порчи текста экранированием кавычек).
 *
 * ОСОЗНАННОЕ ИСКЛЮЧЕНИЕ из §10 п.3 («никаких литералов в имплементационных файлах»):
 * миграция — неизменяемый снимок схемы на конкретный момент, см. подробное
 * обоснование в CreateVacancyLeadsTable.
 */
export class CreateVacancySearchSettingsTable1786700000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "vacancy_search_settings" (
        "id"                  smallint NOT NULL DEFAULT 1,
        "search_text"         character varying(512) NOT NULL,
        "keywords"            text NOT NULL,
        "exclude_keywords"    text,
        "title_prompt"        text NOT NULL,
        "description_prompt"  text NOT NULL,
        "ai_enabled"          boolean NOT NULL DEFAULT false,
        "updated_at"          timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_vacancy_search_settings" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_vacancy_search_settings_id" CHECK ("id" = 1)
      )
    `);

    const titlePrompt =
      'Ты помогаешь отбирать вакансии. Ключевые слова профиля: {keywords}.\n' +
      'Для каждого названия вакансии реши, соответствует ли оно этому профилю.\n' +
      'Учитывай синонимы и родственные технологии, а не только буквальные совпадения.\n' +
      'Отклоняй другие специальности, даже если слово из списка встретилось случайно.\n' +
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
      `INSERT INTO "vacancy_search_settings"
         ("id", "search_text", "keywords", "exclude_keywords", "title_prompt", "description_prompt", "ai_enabled")
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT ("id") DO NOTHING`,
      [
        1,
        'fullstack',
        'fullstack, full-stack, full stack, node.js, nodejs, react, typescript',
        '1С, 1C, php, java, стажёр, стажер, junior',
        titlePrompt,
        descriptionPrompt,
        false,
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "vacancy_search_settings"`);
  }
}
