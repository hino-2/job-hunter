import { VACANCY_SOURCE } from '../applications/applications.constants';
import type { VacancySource } from '../applications/applications.type';
import type { VacancyLeadSearchSource } from '../vacancies/vacancies.type';
import { SCAN_EXHAUSTED_STOPPED_REASONS } from './vacancy-search.constants';
import type {
  VacancyScanPositionSnapshot,
  VacancyScanResumeState,
} from './vacancy-search.interfaces';
import type {
  ScanStoppedReason,
  VacancyScanResumeStateBySource,
  VacancySearchUrlTemplateBySource,
} from './vacancy-search.type';

/**
 * Функция чистая, без DI — тот же приём, что у hh-url.parser.ts: используется и
 * VacancyScanService (start(RESUME)), и контроллером (GET .../scan/status → resume),
 * зависимостей у неё нет, провайдер заставил бы обоих потребителей импортировать
 * лишний модуль.
 *
 * §4.11.12: «Продолжить» доступно только если позиция сохранена при ТОЙ ЖЕ ссылке
 * на выдачу, что действует сейчас (иначе смена searchUrlTemplate — региона,
 * фильтров, сортировки, самого запроса — молча продолжила бы старую выдачу), и
 * указывает на страницу внутри текущего бюджета VACANCY_SCAN_MAX_PAGES (бюджет мог
 * быть уменьшен после сохранения позиции).
 */
export function isResumablePosition(
  position: VacancyScanPositionSnapshot,
  currentSearchUrlTemplate: string,
  maxPages: number,
): boolean {
  return (
    position.searchUrlTemplate !== null &&
    position.searchUrlTemplate === currentSearchUrlTemplate &&
    position.nextPage > 0 &&
    position.nextPage < maxPages
  );
}

/** §4.11.12: причины, при которых выдача исчерпана целиком — позиция прогона очищается, а не сохраняется. */
export function isExhaustedStop(reason: ScanStoppedReason): boolean {
  return SCAN_EXHAUSTED_STOPPED_REASONS.some((item) => item === reason);
}

/**
 * §5.7: доступность «Продолжить» по каждому источнику поиска — тело GET .../scan/status.
 * Каждый источник судится по СВОЕЙ ссылке на выдачу: позиция it-vacancies.ru, взятая
 * при прежнем шаблоне hh.ru, не должна считаться продолжаемой из-за совпадения строк.
 *
 * Источник без строки позиции (миграция ещё не засеяла) получает недоступное
 * «Продолжить», а не исключение: статус — не то место, где стоит падать. Ключи
 * перечислены явно, как в buildSearchUrlTemplateBySource — Object.fromEntries вернул бы
 * Record<string, …> и потребовал приведения типа.
 */
export function buildResumeStateBySource(
  positions: readonly VacancyScanPositionSnapshot[],
  searchUrlTemplateBySource: VacancySearchUrlTemplateBySource,
  maxPages: number,
): VacancyScanResumeStateBySource {
  const bySource = new Map<VacancySource, VacancyScanPositionSnapshot>(
    positions.map((position) => [position.source, position]),
  );

  const resolve = (source: VacancyLeadSearchSource): VacancyScanResumeState => {
    const position = bySource.get(source);

    if (
      position === undefined ||
      !isResumablePosition(position, searchUrlTemplateBySource[source], maxPages)
    ) {
      return { available: false, nextPage: null };
    }

    return { available: true, nextPage: position.nextPage };
  };

  return {
    [VACANCY_SOURCE.HH]: resolve(VACANCY_SOURCE.HH),
    [VACANCY_SOURCE.IT_VACANCIES]: resolve(VACANCY_SOURCE.IT_VACANCIES),
  };
}
