import { normalizeVacancyUrl } from '../vacancies/vacancy-url.helpers';
import {
  IT_VACANCIES_ALLOWED_HOST_PATTERN,
  IT_VACANCIES_VACANCY_ID_GROUP,
  IT_VACANCIES_VACANCY_PATH_PATTERN,
} from './it-vacancies.constants';

/**
 * Извлекает id вакансии из ссылки на вакансию it-vacancies.ru (§4.2, §4.8). Зеркало
 * getmatch-url.parser.ts: чистая функция, а не @Injectable-сервис — её вызывает
 * parseUrl у ItVacanciesApiService, реализующего VacancySourceProvider, а его в свою
 * очередь зовёт VacancyProviderRegistry.resolveByUrl через интерфейс провайдера.
 * Зависимостей у парсера нет, DI ему ничего не даёт.
 *
 * Никогда не бросает: любой мусор на входе — это null, а не 500.
 */
export function parseItVacanciesVacancyId(rawUrl: string | null | undefined): string | null {
  const url = normalizeVacancyUrl(rawUrl);

  if (url === null) {
    return null;
  }

  if (!IT_VACANCIES_ALLOWED_HOST_PATTERN.test(url.hostname)) {
    return null;
  }

  // pathname уже без query и без фрагмента — их отсекает сам URL.
  const match = IT_VACANCIES_VACANCY_PATH_PATTERN.exec(url.pathname);
  const vacancyId = match?.[IT_VACANCIES_VACANCY_ID_GROUP];

  // Отдельной проверки длины (как у getmatch) здесь нет: квантификатор {1,32} в
  // IT_VACANCIES_VACANCY_PATH_PATTERN уже равен ширине колонки vacancy_external_id,
  // поэтому /vacancies/<100 цифр> не совпадёт с шаблоном вовсе.
  return vacancyId ?? null;
}
