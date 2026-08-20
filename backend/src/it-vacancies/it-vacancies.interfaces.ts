/**
 * Формы данных, специфичные для разбора it-vacancies.ru. Общие для всех источников
 * (Vacancy, VacancySearchItem, VacancySearchPage, результаты обращений) живут в
 * vacancies/ — они контракт VacancySourceProvider/VacancyLeadSearchProvider.
 */

/**
 * §4.11.7: разбор страницы вакансии для конвейера поиска лидов. description —
 * полный текст (SSR-блок content) либо обрезанный фолбэк из JSON-LD; logoUrl —
 * hiringOrganization.logo, уже проверенный по allow-list (§4.10).
 */
export interface ItVacanciesDescription {
  description: string;
  logoUrl: string | null;
}
