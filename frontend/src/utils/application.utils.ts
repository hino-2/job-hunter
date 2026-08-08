import dayjs from 'dayjs';

import { APPLICATION_STATUS, STATUS_FILTER } from '../constants/application.constants';
import { UPCOMING_INTERVIEW_HIGHLIGHT_HOURS } from '../constants/layout.constants';
import type {
  Application,
  ApplicationCounts,
  ApplicationsFilters,
  UpcomingInterview,
} from '../types/application.interfaces';

/** Счётчик шапки «Открытых: N / M» (§7.8). Передаётся в select React Query по ссылке. */
export function countApplications(items: readonly Application[]): ApplicationCounts {
  const open = items.filter((item) => item.status === APPLICATION_STATUS.OPEN).length;

  return { open, total: items.length };
}

/**
 * Ближайшее будущее собеседование из hrInterviewAt / techInterviewAt (§7.2.1, элемент 5).
 * Прошедшие и пустые даты отбрасываются: если будущих нет — ячейка шапки не рисуется.
 *
 * «Сейчас» берётся здесь, а не в JSX: React Compiler считает чтение текущего времени
 * в рендере нечистым и правила eslint-plugin-react-hooks на это ругаются.
 */
export function selectUpcomingInterview(application: Application): UpcomingInterview | null {
  const now = dayjs();
  const upcoming = [application.hrInterviewAt, application.techInterviewAt]
    .filter((value): value is string => value !== null)
    .map((value) => dayjs(value))
    .filter((value) => value.isAfter(now))
    .sort((left, right) => left.valueOf() - right.valueOf())
    .at(0);

  if (upcoming === undefined) {
    return null;
  }

  return {
    at: upcoming.toISOString(),
    isSoon: upcoming.diff(now, 'hour', true) <= UPCOMING_INTERVIEW_HIGHLIGHT_HOURS,
  };
}

/**
 * Прячет ли текущий набор фильтров часть записей. Сортировка активным фильтром не
 * считается: она меняет порядок, но ничего не убирает, — иначе пустой список после
 * простой смены сортировки предлагал бы «Сбросить фильтры» без причины.
 */
export function isFilterActive(filters: ApplicationsFilters): boolean {
  return filters.status !== STATUS_FILTER.ALL || filters.search.trim().length > 0;
}
