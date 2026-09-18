/**
 * Формы данных, специфичные для разбора geekjob.ru. Общие для всех источников
 * (Vacancy, VacancySearchItem, VacancySearchPage, результаты обращений) живут в
 * vacancies/ — они контракт VacancySourceProvider/VacancyLeadSearchProvider.
 */

/**
 * §4.11.7: разбор страницы вакансии для конвейера поиска лидов. description — текст
 * блока #vacancy-description; logoUrl — из #logo-box, уже проверенный по allow-list
 * (§4.10).
 */
export interface GeekjobDescription {
  description: string;
  logoUrl: string | null;
}

/** §4.13: разбор короткой формы оклада ("100K — 180K ₽", "от 800 €", "27.2K ₽"). */
export interface GeekjobSalaryRange {
  salaryFrom: number | null;
  salaryTo: number | null;
  salaryCurrency: string | null;
}
