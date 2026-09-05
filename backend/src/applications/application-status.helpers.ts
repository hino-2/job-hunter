import { ACTIVE_APPLICATION_STATUSES, APPLICATION_STATUS } from './applications.constants';
import type { InterviewStatusInput } from './applications.interfaces';
import type { ApplicationStatus } from './applications.type';

/**
 * §3.2: «не завершена» — один из ACTIVE_APPLICATION_STATUSES, а не буквально OPEN.
 * Питает выборку sync-open, фильтр «Открытые» и счётчик в шапке (все три места
 * раньше сравнивали статус напрямую с OPEN).
 *
 * some, а не includes — по той же причине, что и isTerminalApplicationResult:
 * ACTIVE_APPLICATION_STATUSES — узкий union из трёх литералов, и includes не принял
 * бы аргумент типа ApplicationStatus.
 */
export function isActiveApplicationStatus(status: ApplicationStatus): boolean {
  return ACTIVE_APPLICATION_STATUSES.some((active) => active === status);
}

/**
 * §3.2: статус, выводимый из дат собеседований, — единственное место, где решается
 * это правило (используется и на INSERT, и на PATCH).
 *
 * null означает «не трогать status» — либо эффективный статус уже CLOSED (терминальный
 * result или явный status: CLOSED в том же теле запроса, что вызывающая сторона обязана
 * подставить в input.status ДО вызова), либо обе даты пусты и запись не была в стадии
 * собеседования.
 *
 * techInterviewAt проверяется первым и безусловно: наличие техсобеса важнее HR-этапа
 * независимо от того, заполнена ли дата HR-собеса.
 */
export function deriveInterviewStatus(input: InterviewStatusInput): ApplicationStatus | null {
  if (input.status === APPLICATION_STATUS.CLOSED) {
    return null;
  }

  if (input.techInterviewAt !== null) {
    return APPLICATION_STATUS.TECH_INTERVIEW;
  }

  if (input.hrInterviewAt !== null) {
    return APPLICATION_STATUS.HR_INTERVIEW;
  }

  // Обе даты очищены: запись, ранее стоявшая на стадии собеседования, возвращается в OPEN.
  if (
    input.status === APPLICATION_STATUS.HR_INTERVIEW ||
    input.status === APPLICATION_STATUS.TECH_INTERVIEW
  ) {
    return APPLICATION_STATUS.OPEN;
  }

  return null;
}
