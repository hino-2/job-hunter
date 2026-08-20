import {
  VACANCY_SOURCE_LABELS,
  VACANCY_SOURCE_UNKNOWN_LABEL,
} from '../constants/application.constants';
import {
  SCAN_PAGE_NUMBER_OFFSET,
  SCAN_PAGE_PROGRESS_PREFIX,
  SCAN_PAGE_PROGRESS_SEPARATOR,
  SCAN_PROGRESS_CREATED_LABEL,
  SCAN_PROGRESS_DUPLICATES_LABEL,
  SCAN_PROGRESS_FAILED_LABEL,
  SCAN_PROGRESS_PAGES_LABEL,
  SCAN_PROGRESS_PERCENT_SCALE,
  SCAN_PROGRESS_REJECTED_LABEL,
  SCAN_PROGRESS_SEEN_LABEL,
  SCAN_RESUME_BUTTON_LABEL,
  SCAN_RESUME_BUTTON_PAGE_PREFIX,
  SCAN_STATUS,
  SCAN_STOPPED_REASON,
  SCAN_STOPPED_REASON_LABELS,
  SCAN_SUMMARY_SEPARATOR,
  SCAN_SUMMARY_VALUE_SEPARATOR,
} from '../constants/vacancy-search.constants';
import { NOTIFICATION_SEVERITY } from '../constants/notification.constants';
import type { VacancySource } from '../types/application.type';
import type { NotificationSeverity } from '../types/notification.type';
import type {
  ScanPageProgress,
  ScanProgress,
  ScanResumeState,
  ScanStatusResponse,
} from '../types/vacancy-search.interfaces';

/** Производные статуса прогона поиска (§7.9.2), чистые функции без литералов внутри. */

/**
 * §5.7, §7.9.2: подпись источника прогона — тот же словарь, что у tooltip'а иконки
 * синхронизации отклика (§7.2.3). null приходит только до самого первого прогона,
 * когда Alert ещё не показывается вовсе, но значение всё равно обязано остаться
 * читаемым, а не пустым.
 */
export function formatScanSourceLabel(source: VacancySource | null): string {
  return source === null ? VACANCY_SOURCE_UNKNOWN_LABEL : VACANCY_SOURCE_LABELS[source];
}

/**
 * «hh.ru · страниц 3 · просмотрено 40 · найдено 2 · дублей 5 · отклонено моделью 12 ·
 * ошибок 0». Источник идёт первым: прогон один на все источники (§4.11.12), и по одним
 * счётчикам не понять, чью выдачу сейчас разбирают.
 * После смены порядка эшелонов дедупликации (§4.11.4, §4.11.5) «дублей» считает лидов,
 * узнанных ещё ДО ИИ по названию (эшелон 2 по БД), а «отклонено моделью» — только тех,
 * кто дедупликацию уже прошёл.
 */
export function formatScanProgressText(
  progress: ScanProgress,
  source: VacancySource | null,
): string {
  const rejectedByModel = progress.rejectedTitle + progress.rejectedDescription;
  const parts = [
    formatScanSourceLabel(source),
    `${SCAN_PROGRESS_PAGES_LABEL}${SCAN_SUMMARY_VALUE_SEPARATOR}${progress.pagesFetched}`,
    `${SCAN_PROGRESS_SEEN_LABEL}${SCAN_SUMMARY_VALUE_SEPARATOR}${progress.itemsSeen}`,
    `${SCAN_PROGRESS_CREATED_LABEL}${SCAN_SUMMARY_VALUE_SEPARATOR}${progress.created}`,
    `${SCAN_PROGRESS_DUPLICATES_LABEL}${SCAN_SUMMARY_VALUE_SEPARATOR}${progress.duplicates}`,
    `${SCAN_PROGRESS_REJECTED_LABEL}${SCAN_SUMMARY_VALUE_SEPARATOR}${rejectedByModel}`,
    `${SCAN_PROGRESS_FAILED_LABEL}${SCAN_SUMMARY_VALUE_SEPARATOR}${progress.failed}`,
  ];

  return parts.join(SCAN_SUMMARY_SEPARATOR);
}

/** Итоговая сводка после остановки прогона: причина человеческим текстом + счётчики. */
export function formatScanSummaryText(status: ScanStatusResponse): string {
  const reasonLabel =
    status.stoppedReason === null ? null : SCAN_STOPPED_REASON_LABELS[status.stoppedReason];
  const parts = [
    reasonLabel,
    formatScanProgressText(status.progress, status.source),
    status.message,
  ].filter((part): part is string => part !== null && part.length > 0);

  return parts.join(SCAN_SUMMARY_SEPARATOR);
}

/**
 * §7.9.2: сбой самого запроса — отдельный канал (error-Snackbar, не эта функция).
 * Здесь — исключительно severity Alert'а по уже полученному статусу: во время прогона
 * info, stoppedReason === 'ERROR' — error, успешный прогон — success, а created === 0 — info.
 */
export function selectScanAlertSeverity(status: ScanStatusResponse): NotificationSeverity {
  if (status.status === SCAN_STATUS.RUNNING) {
    return NOTIFICATION_SEVERITY.INFO;
  }

  if (status.stoppedReason === SCAN_STOPPED_REASON.ERROR) {
    return NOTIFICATION_SEVERITY.ERROR;
  }

  if (status.progress.created === 0) {
    return NOTIFICATION_SEVERITY.INFO;
  }

  return NOTIFICATION_SEVERITY.SUCCESS;
}

/**
 * §7.9.2, §4.11.12: «страница 18 из 40». null, пока currentPage ещё не пришёл с бэкенда
 * (прогон только запущен либо не идёт вовсе) — Alert тогда эту строку не показывает.
 * currentPage — 0-based индекс страницы выдачи, человеку показываем 1-based номер.
 */
export function formatScanPageProgressText(pageProgress: ScanPageProgress): string | null {
  if (pageProgress.currentPage === null) {
    return null;
  }

  const pageNumber = pageProgress.currentPage + SCAN_PAGE_NUMBER_OFFSET;

  return (
    `${SCAN_PAGE_PROGRESS_PREFIX}${SCAN_SUMMARY_VALUE_SEPARATOR}${pageNumber}` +
    `${SCAN_PAGE_PROGRESS_SEPARATOR}${pageProgress.totalPages}`
  );
}

/**
 * §7.9.2: доля пройденных страниц в процентах для LinearProgress'а. null, пока currentPage
 * неизвестен — тогда индикатор остаётся indeterminate. min(…, 100) — currentPage может
 * совпасть с последним индексом totalPages - 1, что и даёт ровно 100%, но подстраховка
 * не помешает при рассинхронизации totalPages между двумя опросами.
 */
export function selectScanProgressPercent(pageProgress: ScanPageProgress): number | null {
  if (pageProgress.currentPage === null) {
    return null;
  }

  const percent =
    ((pageProgress.currentPage + SCAN_PAGE_NUMBER_OFFSET) / pageProgress.totalPages) *
    SCAN_PROGRESS_PERCENT_SCALE;

  return Math.min(percent, SCAN_PROGRESS_PERCENT_SCALE);
}

/**
 * §7.9.2, §4.11.12: подпись кнопки «Продолжить» — растёт номером страницы, когда позиция
 * известна (человеку — 1-based). Доступность самой кнопки решает resume.available
 * отдельно (VacancyLeadsFilterBar), здесь только текст.
 */
export function formatResumeButtonLabel(resume: ScanResumeState): string {
  if (resume.nextPage === null) {
    return SCAN_RESUME_BUTTON_LABEL;
  }

  const pageNumber = resume.nextPage + SCAN_PAGE_NUMBER_OFFSET;

  return `${SCAN_RESUME_BUTTON_PAGE_PREFIX}${SCAN_SUMMARY_VALUE_SEPARATOR}${pageNumber}`;
}
