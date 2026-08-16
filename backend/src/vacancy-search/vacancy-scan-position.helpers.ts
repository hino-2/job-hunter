import { SCAN_EXHAUSTED_STOPPED_REASONS } from './vacancy-search.constants';
import type { VacancyScanPositionSnapshot } from './vacancy-search.interfaces';
import type { ScanStoppedReason } from './vacancy-search.type';

/**
 * Функция чистая, без DI — тот же приём, что у hh-url.parser.ts: используется и
 * VacancyScanService (start(RESUME)), и контроллером (GET .../scan/status → resume),
 * зависимостей у неё нет, провайдер заставил бы обоих потребителей импортировать
 * лишний модуль.
 *
 * §4.11.12: «Продолжить» доступно только если позиция сохранена при ТОМ ЖЕ тексте
 * поиска, что действует сейчас (иначе смена searchText молча продолжила бы старую
 * выдачу), и указывает на страницу внутри текущего бюджета VACANCY_SCAN_MAX_PAGES
 * (бюджет мог быть уменьшен после сохранения позиции).
 */
export function isResumablePosition(
  position: VacancyScanPositionSnapshot,
  currentSearchText: string,
  maxPages: number,
): boolean {
  return (
    position.searchText !== null &&
    position.searchText === currentSearchText &&
    position.nextPage > 0 &&
    position.nextPage < maxPages
  );
}

/** §4.11.12: причины, при которых выдача исчерпана целиком — позиция прогона очищается, а не сохраняется. */
export function isExhaustedStop(reason: ScanStoppedReason): boolean {
  return SCAN_EXHAUSTED_STOPPED_REASONS.some((item) => item === reason);
}
