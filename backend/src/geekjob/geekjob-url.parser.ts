import { normalizeVacancyUrl } from '../vacancies/vacancy-url.helpers';
import {
  GEEKJOB_ALLOWED_HOST_PATTERN,
  GEEKJOB_VACANCY_ID_GROUP,
  GEEKJOB_VACANCY_PATH_PATTERN,
} from './geekjob.constants';

/**
 * Извлекает id вакансии из ссылки на вакансию geekjob.ru (§4.2, §4.8, §4.13). Зеркало
 * it-vacancies-url.parser.ts: чистая функция, а не @Injectable-сервис — её вызывает
 * parseUrl у GeekjobApiService, реализующего VacancySourceProvider, а его в свою
 * очередь зовёт VacancyProviderRegistry.resolveByUrl через интерфейс провайдера.
 * Зависимостей у парсера нет, DI ему ничего не даёт.
 *
 * §4.13: короткая ссылка geekjob.ru/hiei этим парсером НЕ распознаётся — резолв
 * короткой ссылки в id потребовал бы отдельного сетевого запроса, а parseUrl обязан
 * быть чистой синхронной функцией. Такая ссылка получает SKIPPED_UNSUPPORTED.
 *
 * Никогда не бросает: любой мусор на входе — это null, а не 500.
 */
export function parseGeekjobVacancyId(rawUrl: string | null | undefined): string | null {
  const url = normalizeVacancyUrl(rawUrl);

  if (url === null) {
    return null;
  }

  if (!GEEKJOB_ALLOWED_HOST_PATTERN.test(url.hostname)) {
    return null;
  }

  // pathname уже без query и без фрагмента — их отсекает сам URL.
  const match = GEEKJOB_VACANCY_PATH_PATTERN.exec(url.pathname);
  const vacancyId = match?.[GEEKJOB_VACANCY_ID_GROUP];

  return vacancyId === undefined ? null : vacancyId.toLowerCase();
}
