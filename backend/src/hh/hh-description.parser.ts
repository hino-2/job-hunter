import { JSON_LD_FIELD } from './hh.constants';
import { extractJsonLdEntries, findJobPosting, readString } from './hh-json-ld.helpers';

/**
 * §4.11.7: описание вакансии для ИИ-отбора — поле description того же блока
 * <script type="application/ld+json"> JobPosting, который разбирает hh-page.parser.ts
 * при синхронизации (§4.1). Отдельная функция, а не переиспользование
 * parseHhVacancyPage: синхронизации description не нужен, а этой функции не нужны
 * archived/logo — совмещать их означало бы тянуть чужие обязательные поля.
 *
 * Возвращает сырой HTML-фрагмент (как отдал JSON-LD) — приведение к plain text
 * (common/html.helpers.ts) и обрезка по VACANCY_AI_DESCRIPTION_MAX_CHARS —
 * забота вызывающего (HhSearchService и, дальше по конвейеру, vacancy-ai/).
 *
 * Никогда не бросает: любой мусор на входе — null, как и у parseHhVacancyPage.
 */
export function parseHhVacancyDescription(html: unknown): string | null {
  if (typeof html !== 'string' || html.length === 0) {
    return null;
  }

  const jobPosting = findJobPosting(extractJsonLdEntries(html));

  if (jobPosting === null) {
    return null;
  }

  return readString(jobPosting, JSON_LD_FIELD.DESCRIPTION);
}
