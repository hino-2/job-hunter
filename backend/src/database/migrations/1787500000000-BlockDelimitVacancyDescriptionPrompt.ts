import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Блочная разметка дефолтного промпта отбора по описанию (§4.12.2) плюс новое поле
 * `evidence` в ответе модели (§4.12.3).
 *
 * Инцидент: вакансия «Middle backend Developer» (Java/Spring) прошла отбор по описанию
 * с сохранённым `ai_description_reason`, гласившим «Node.js (в названии вакансии),
 * TypeScript…» — ни одного из этих слов не было ни в названии, ни в описании. Прежний
 * промпт кладёт список ключевых слов профиля на первую строку без структурных
 * разделителей, и `qwen3:4b-instruct` спутал этот список с текстом самой вакансии
 * и процитировал его как её требования. Новая редакция размечает вход блоками
 * `<keywords>`/`<title>`/`<company>`/`<description>` и прямо запрещает модели брать
 * слова из блока `<keywords>` как принадлежащие вакансии, а поле `evidence` заставляет
 * модель подтвердить `reason` дословной цитатой из `<description>` — эту цитату
 * `VacancyAiService.judgeDescription` (isEvidenceGrounded, vacancy-ai.helpers.ts)
 * сверяет с реальным текстом описания и превращает несовпадение в фолбэк на ключевые
 * слова, а не в сохранённый лид с придуманным основанием.
 *
 * UPDATE идёт с условием на прежний текст (WHERE): промпт правится пользователем на
 * фронте (§7.9.4), и безусловная перезапись затёрла бы его правку. down() по той же
 * причине возвращает старый текст только там, где сейчас стоит ровно новый — иначе
 * revert затирал бы правку пользователя поверх отсутствующего upgrade (тот же урок,
 * что разбирался в RepairGetmatchVacancySource: непарный откат склеил чужие данные).
 *
 * ОСОЗНАННОЕ ИСКЛЮЧЕНИЕ из §10 п.3 («никаких литералов в имплементационных файлах»):
 * миграция — неизменяемый снимок данных на конкретный момент, см. подробное
 * обоснование в CreateVacancyLeadsTable.
 */
export class BlockDelimitVacancyDescriptionPrompt1787500000000 implements MigrationInterface {
  private readonly previousPrompt =
    'Ты помогаешь отбирать вакансии. Ключевые слова профиля: {keywords}.\n' +
    'Вакансия: {title} в компании {company}.\n' +
    'Описание:\n' +
    '{description}\n' +
    'Реши, действительно ли эта вакансия соответствует профилю: нужны ли в ней перечисленные\n' +
    'технологии как основные, а не упомянуты вскользь. Ответь JSON-объектом.';

  private readonly blockDelimitedPrompt =
    'Ты помогаешь отбирать вакансии. Данные размечены блоками.\n' +
    '<keywords>{keywords}</keywords>\n' +
    '<title>{title}</title>\n' +
    '<company>{company}</company>\n' +
    '<description>{description}</description>\n' +
    'Блок <keywords> — это профиль кандидата, а НЕ текст вакансии: слова оттуда нельзя\n' +
    'приписывать вакансии и нельзя цитировать как её требования.\n' +
    'Реши, требует ли вакансия технологии профиля как основные, а не упоминает их вскользь.\n' +
    'Если основной стек вакансии не пересекается с профилем, ответ — false.\n' +
    'Ответь JSON-объектом с полями:\n' +
    'matches — true или false;\n' +
    'reason — обоснование на русском, опирающееся ТОЛЬКО на блоки <description> и <title>;\n' +
    'evidence — дословная цитата из блока <description>, подтверждающая ответ, скопированная\n' +
    'посимвольно и без слов из других блоков.';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "vacancy_search_settings"
         SET "description_prompt" = $1
       WHERE "description_prompt" = $2`,
      [this.blockDelimitedPrompt, this.previousPrompt],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "vacancy_search_settings"
         SET "description_prompt" = $1
       WHERE "description_prompt" = $2`,
      [this.previousPrompt, this.blockDelimitedPrompt],
    );
  }
}
