import { VACANCY_EXTERNAL_ID_COLUMN_LENGTH } from '../applications/applications.constants';
import { normalizeVacancyUrl } from '../vacancies/vacancy-url.helpers';
import {
  GETMATCH_ALLOWED_HOST_PATTERN,
  GETMATCH_VACANCY_ID_GROUP,
  GETMATCH_VACANCY_PATH_PATTERN,
} from './getmatch.constants';

/**
 * Извлекает id вакансии из ссылки на вакансию getmatch.ru (§4.9). Зеркало
 * hh-url.parser.ts: чистая функция, а не @Injectable-сервис — её вызывает parseUrl
 * метода GetmatchApiService, реализующего VacancySourceProvider, а его в свою
 * очередь зовёт VacancyProviderRegistry.resolveByUrl через интерфейс провайдера,
 * не напрямую. Зависимостей у парсера нет, DI ему ничего не даёт.
 *
 * Никогда не бросает: любой мусор на входе — это null, а не 500.
 */
export function parseGetmatchVacancyId(rawUrl: string | null | undefined): string | null {
  const url = normalizeVacancyUrl(rawUrl);

  if (url === null) {
    return null;
  }

  if (!GETMATCH_ALLOWED_HOST_PATTERN.test(url.hostname)) {
    return null;
  }

  // pathname уже без query и без фрагмента — их отсекает сам URL.
  const match = GETMATCH_VACANCY_PATH_PATTERN.exec(url.pathname);
  const vacancyId = match?.[GETMATCH_VACANCY_ID_GROUP];

  if (vacancyId === undefined) {
    return null;
  }

  // Длина ограничена шириной колонки vacancy_external_id: иначе /vacancies/<100 цифр>
  // сохранился бы в БД ошибкой драйвера, то есть 500 вместо штатного «не getmatch-вакансия».
  if (vacancyId.length > VACANCY_EXTERNAL_ID_COLUMN_LENGTH) {
    return null;
  }

  return vacancyId;
}
