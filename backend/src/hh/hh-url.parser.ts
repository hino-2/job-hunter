import { VACANCY_EXTERNAL_ID_COLUMN_LENGTH } from '../applications/applications.constants';
import { normalizeVacancyUrl } from '../vacancies/vacancy-url.helpers';
import {
  HH_ALLOWED_HOST_PATTERN,
  HH_VACANCY_ID_GROUP,
  HH_VACANCY_PATH_PATTERN,
} from './hh.constants';

/**
 * Извлекает vacancy_id из ссылки на вакансию hh.ru (§4.2).
 *
 * Это чистая функция, а не @Injectable-сервис, намеренно: её вызывает parseUrl
 * метода HhApiService, реализующего VacancySourceProvider, — а его в свою очередь
 * зовёт VacancyProviderRegistry.resolveByUrl через интерфейс провайдера, не напрямую.
 * Зависимостей у парсера нет, DI ему ничего не даёт, а провайдер обязывал бы каждого
 * вызывающего тянуть за собой модуль.
 *
 * Никогда не бросает: любой мусор на входе — это null, а не 500.
 */
export function parseHhVacancyId(rawUrl: string | null | undefined): string | null {
  const url = normalizeVacancyUrl(rawUrl);

  if (url === null) {
    return null;
  }

  if (!HH_ALLOWED_HOST_PATTERN.test(url.hostname)) {
    return null;
  }

  // pathname уже без query и без фрагмента — «?from=…» и «#responses» отсекает сам URL.
  const match = HH_VACANCY_PATH_PATTERN.exec(url.pathname);
  const vacancyId = match?.[HH_VACANCY_ID_GROUP];

  if (vacancyId === undefined) {
    return null;
  }

  // Длина ограничена шириной колонки vacancy_external_id: иначе /vacancy/<100 цифр>
  // сохранился бы в БД ошибкой драйвера, то есть 500 вместо штатного «не hh-вакансия».
  if (vacancyId.length > VACANCY_EXTERNAL_ID_COLUMN_LENGTH) {
    return null;
  }

  return vacancyId;
}
