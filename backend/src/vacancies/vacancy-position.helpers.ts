import { POSITION_MAX_LENGTH } from '../applications/applications.constants';
import { EMPTY_STRING } from '../common/common.constants';

/**
 * Нормализация заголовка вакансии перед записью в колонку position (§4.3 п.5,
 * новая редакция): срез по ширине колонки делаем здесь же, в момент нормализации,
 * а не полагаемся на то, что источник вернёт короткую строку. Иначе длинный
 * заголовок с сайта источника дал бы QueryFailedError на save() и штатный
 * исход OK превратился бы в 500 — тот же принцип, что у toHhVacancy для
 * hh_vacancy_type.
 *
 * null и пустая после trim() строка возвращаются как null: вызывающий обязан
 * трактовать null как «источник не дал заголовка» и не писать его в патч,
 * не затирая ручную правку пользователя.
 */
export function normalizeVacancyPosition(name: string | null): string | null {
  if (name === null) {
    return null;
  }

  const trimmed = name.trim();

  if (trimmed === EMPTY_STRING) {
    return null;
  }

  return trimmed.slice(0, POSITION_MAX_LENGTH);
}
