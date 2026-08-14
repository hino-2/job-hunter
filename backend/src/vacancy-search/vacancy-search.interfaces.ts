/**
 * §5.7: снимок настроек поиска с уже разобранными списками ключевых/стоп-слов
 * (parseKeywordList, vacancy-keywords.helpers.ts). Конвейер отбора (§4.11.4, шаг B6)
 * обязан брать снимок ровно один раз при старте прогона — «изменения применяются
 * со следующего прогона», иначе половина выдачи судилась бы одним промптом,
 * половина другим.
 */
export interface VacancySearchSettingsSnapshot {
  searchText: string;
  keywords: string[];
  excludeKeywords: string[];
  titlePrompt: string;
  descriptionPrompt: string;
  aiEnabled: boolean;
  updatedAt: Date;
}
