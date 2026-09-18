import { Alert, LinearProgress, Stack, Typography } from '@mui/material';

import { FIELD_GAP } from '../../constants/layout.constants';
import { SCAN_AI_WARM_UP_LABEL, SCAN_STATUS } from '../../constants/vacancy-search.constants';
import {
  formatScanPageProgressText,
  formatScanProgressText,
  formatScanSourceLabel,
  formatScanSummaryText,
  selectScanAlertSeverity,
  selectScanProgressPercent,
} from '../../utils/vacancy-scan.utils';
import type { ScanStatusAlertProps } from './scan-status-alert.interfaces';

/**
 * Прогресс/итог прогона поиска (§7.9.2, §4.11.12): один и тот же Alert, во время
 * прогона — строка «страница N из M» (пока currentPage известен) над счётчиками и
 * LinearProgress, после остановки — итоговая сводка с человекочитаемой причиной.
 * Первым элементом строки счётчиков идёт источник прогона (§5.7, formatScanSourceLabel):
 * во время RUNNING — сайт, который читается прямо сейчас, даже если запрошены «Все
 * источники» (по одним цифрам не понять, чью выдачу сейчас разбирают); в итоговой сводке
 * прогона «Все источники» — «Все источники» целиком, счётчики там сумма по всем этапам.
 * LinearProgress переключается на determinate, как только известна доля пройденных
 * страниц, и остаётся indeterminate, пока currentPage ещё null (сразу после старта).
 * Кнопки закрытия нет намеренно: §7.9.2 требует показывать статус последнего прогона
 * и при монтировании экрана, а не только пока открыта вкладка, где он запущен.
 * Пока грузится модель (aiWarmingUp, §5.7), счётчики и страница выдачи ещё нулевые —
 * вместо них строка «запуск модели...» и indeterminate LinearProgress: backend уже
 * выставляет currentPage = startPage на этом этапе, и determinate-бар показал бы
 * бессмысленное значение прогресса.
 */
export function ScanStatusAlert({ status }: ScanStatusAlertProps) {
  const isRunning = status.status === SCAN_STATUS.RUNNING;
  const isWarmingUp = isRunning && status.aiWarmingUp;
  const severity = selectScanAlertSeverity(status);
  const pageProgressText = formatScanPageProgressText(status.pageProgress);
  const progressPercent = selectScanProgressPercent(status.pageProgress);

  const bodyText = isWarmingUp
    ? SCAN_AI_WARM_UP_LABEL
    : isRunning
      ? formatScanProgressText(status.progress, formatScanSourceLabel(status))
      : formatScanSummaryText(status);

  return (
    <Alert severity={severity}>
      <Stack spacing={FIELD_GAP}>
        {isRunning && !isWarmingUp && pageProgressText !== null ? (
          <Typography variant="body2">{pageProgressText}</Typography>
        ) : null}

        <Typography variant="body2">{bodyText}</Typography>

        {isRunning ? (
          isWarmingUp || progressPercent === null ? (
            <LinearProgress />
          ) : (
            <LinearProgress variant="determinate" value={progressPercent} />
          )
        ) : null}
      </Stack>
    </Alert>
  );
}
