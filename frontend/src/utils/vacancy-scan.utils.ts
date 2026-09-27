import {
  VACANCY_SOURCE_LABELS,
  VACANCY_SOURCE_UNKNOWN_LABEL,
} from '../constants/application.constants';
import {
  EMPTY_SCAN_RESUME_STATE,
  SCAN_PAGE_NUMBER_OFFSET,
  SCAN_PAGE_PROGRESS_PREFIX,
  SCAN_PAGE_PROGRESS_SEPARATOR,
  SCAN_PROGRESS_CREATED_LABEL,
  SCAN_PROGRESS_DUPLICATES_LABEL,
  SCAN_PROGRESS_FAILED_LABEL,
  SCAN_PROGRESS_AI_SKIPPED_LABEL,
  SCAN_PROGRESS_PAGES_LABEL,
  SCAN_PROGRESS_PAGES_FAILED_LABEL,
  SCAN_PROGRESS_PERCENT_SCALE,
  SCAN_PROGRESS_REJECTED_LABEL,
  SCAN_PROGRESS_SEEN_LABEL,
  SCAN_RESUME_BUTTON_LABEL,
  SCAN_RESUME_BUTTON_PAGE_PREFIX,
  SCAN_RESUME_STATE_ANY_SOURCE,
  SCAN_SOURCE_ALL,
  SCAN_SOURCE_ALL_LABEL,
  SCAN_STATUS,
  SCAN_STOPPED_REASON,
  SCAN_STOPPED_REASON_LABELS,
  SCAN_SUMMARY_SEPARATOR,
  SCAN_SUMMARY_VALUE_SEPARATOR,
  VACANCY_LEAD_SEARCH_SOURCES,
} from '../constants/vacancy-search.constants';
import { NOTIFICATION_SEVERITY } from '../constants/notification.constants';
import type { NotificationSeverity } from '../types/notification.type';
import type { ScanResumeStateBySource, ScanSourceSelection } from '../types/vacancy-search.type';
import type {
  ScanPageProgress,
  ScanProgress,
  ScanResumeState,
  ScanStatusResponse,
} from '../types/vacancy-search.interfaces';

/** Производные статуса прогона поиска (§7.9.2), чистые функции без литералов внутри. */

/**
 * §5.7, §7.9.2: подпись источника прогона. Пока прогон RUNNING, называет конкретный сайт,
 * который читается прямо сейчас (status.source) — тот же словарь, что у tooltip'а иконки
 * синхронизации отклика (§7.2.3): пользователю важно, чью выдачу разбирают в этот момент,
 * даже когда запрошены «Все источники». В итоговой сводке счётчики — сумма по всем этапам
 * прогона, поэтому там название последнего этапа было бы неправдой: при selection === 'ALL'
 * сводка называет «Все источники», иначе — тот же конкретный сайт. source === null бывает
 * только до самого первого прогона, когда Alert ещё не показывается вовсе, но значение
 * всё равно обязано остаться читаемым, а не пустым.
 */
export function formatScanSourceLabel(status: ScanStatusResponse): string {
  const concreteSourceLabel =
    status.source === null ? VACANCY_SOURCE_UNKNOWN_LABEL : VACANCY_SOURCE_LABELS[status.source];

  if (status.status === SCAN_STATUS.RUNNING) {
    return concreteSourceLabel;
  }

  return status.selection === SCAN_SOURCE_ALL ? SCAN_SOURCE_ALL_LABEL : concreteSourceLabel;
}

/**
 * «hh.ru · страниц 3 · страниц с ошибкой 0 · просмотрено 40 · найдено 2 · дублей 5 ·
 * отклонено моделью 12 · ошибок 0 · пропущено моделью 1». Источник идёт первым: прогон
 * один на все источники (§4.11.12), и по одним счётчикам не понять, чью выдачу сейчас
 * разбирают. После смены порядка эшелонов дедупликации (§4.11.4, §4.11.5) «дублей» считает
 * лидов, узнанных ещё ДО ИИ по названию (эшелон 2 по БД), а «отклонено моделью» — только
 * тех, кто дедупликацию уже прошёл. «страниц с ошибкой» (§4.11.11) показывается всегда,
 * даже при нуле, той же логикой, что и «ошибок».
 */
export function formatScanProgressText(progress: ScanProgress, sourceLabel: string): string {
  const rejectedByModel = progress.rejectedTitle + progress.rejectedDescription;
  const parts = [
    sourceLabel,
    `${SCAN_PROGRESS_PAGES_LABEL}${SCAN_SUMMARY_VALUE_SEPARATOR}${progress.pagesFetched}`,
    `${SCAN_PROGRESS_PAGES_FAILED_LABEL}${SCAN_SUMMARY_VALUE_SEPARATOR}${progress.pagesFailed}`,
    `${SCAN_PROGRESS_SEEN_LABEL}${SCAN_SUMMARY_VALUE_SEPARATOR}${progress.itemsSeen}`,
    `${SCAN_PROGRESS_CREATED_LABEL}${SCAN_SUMMARY_VALUE_SEPARATOR}${progress.created}`,
    `${SCAN_PROGRESS_DUPLICATES_LABEL}${SCAN_SUMMARY_VALUE_SEPARATOR}${progress.duplicates}`,
    `${SCAN_PROGRESS_REJECTED_LABEL}${SCAN_SUMMARY_VALUE_SEPARATOR}${rejectedByModel}`,
    `${SCAN_PROGRESS_FAILED_LABEL}${SCAN_SUMMARY_VALUE_SEPARATOR}${progress.failed}`,
    `${SCAN_PROGRESS_AI_SKIPPED_LABEL}${SCAN_SUMMARY_VALUE_SEPARATOR}${progress.aiSkipped}`,
  ];

  return parts.join(SCAN_SUMMARY_SEPARATOR);
}

/** Итоговая сводка после остановки прогона: причина человеческим текстом + счётчики. */
export function formatScanSummaryText(status: ScanStatusResponse): string {
  const reasonLabel =
    status.stoppedReason === null ? null : SCAN_STOPPED_REASON_LABELS[status.stoppedReason];
  const parts = [
    reasonLabel,
    formatScanProgressText(status.progress, formatScanSourceLabel(status)),
    status.message,
  ].filter((part): part is string => part !== null && part.length > 0);

  return parts.join(SCAN_SUMMARY_SEPARATOR);
}

/**
 * §7.9.2: сбой самого запроса — отдельный канал (error-Snackbar, не эта функция).
 * Здесь — исключительно severity Alert'а по уже полученному статусу: во время прогона
 * info, stoppedReason === 'ERROR' — error, AI_UNAVAILABLE — warning (даже если что-то уже
 * найдено, это не полноценный успех), успешный прогон — success, а created === 0 — info.
 */
export function selectScanAlertSeverity(status: ScanStatusResponse): NotificationSeverity {
  if (status.status === SCAN_STATUS.RUNNING) {
    return NOTIFICATION_SEVERITY.INFO;
  }

  if (status.stoppedReason === SCAN_STOPPED_REASON.ERROR) {
    return NOTIFICATION_SEVERITY.ERROR;
  }

  if (status.stoppedReason === SCAN_STOPPED_REASON.AI_UNAVAILABLE) {
    return NOTIFICATION_SEVERITY.WARNING;
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

/**
 * §5.7, §4.11.12: срез resumeBySource для выбранного пункта «Источник». При «Все
 * источники» кнопка «Продолжить» доступна, если хотя бы один сайт из
 * VACANCY_LEAD_SEARCH_SOURCES резервировал позицию — тогда прогон продолжит с них,
 * остальные пройдёт с нуля. Оба варианта возвращают стабильную ссылку (константу либо
 * сам объект из кэша запроса), поэтому useMemo на месте вызова не нужен (§10).
 */
export function selectScanResumeState(
  resumeBySource: ScanResumeStateBySource | undefined,
  selection: ScanSourceSelection,
): ScanResumeState {
  if (resumeBySource === undefined) {
    return EMPTY_SCAN_RESUME_STATE;
  }

  if (selection === SCAN_SOURCE_ALL) {
    const anyAvailable = VACANCY_LEAD_SEARCH_SOURCES.some(
      (source) => resumeBySource[source]?.available === true,
    );

    return anyAvailable ? SCAN_RESUME_STATE_ANY_SOURCE : EMPTY_SCAN_RESUME_STATE;
  }

  return resumeBySource[selection] ?? EMPTY_SCAN_RESUME_STATE;
}
