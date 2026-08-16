import { Alert, LinearProgress, Stack, Typography } from '@mui/material';

import { FIELD_GAP } from '../../constants/layout.constants';
import { SCAN_STATUS } from '../../constants/vacancy-search.constants';
import {
  formatScanPageProgressText,
  formatScanProgressText,
  formatScanSummaryText,
  selectScanAlertSeverity,
  selectScanProgressPercent,
} from '../../utils/vacancy-scan.utils';
import type { ScanStatusAlertProps } from './scan-status-alert.interfaces';

/**
 * Прогресс/итог прогона поиска (§7.9.2, §4.11.12): один и тот же Alert, во время
 * прогона — строка «страница N из M» (пока currentPage известен) над счётчиками и
 * LinearProgress, после остановки — итоговая сводка с человекочитаемой причиной.
 * LinearProgress переключается на determinate, как только известна доля пройденных
 * страниц, и остаётся indeterminate, пока currentPage ещё null (сразу после старта).
 * Кнопки закрытия нет намеренно: §7.9.2 требует показывать статус последнего прогона
 * и при монтировании экрана, а не только пока открыта вкладка, где он запущен.
 */
export function ScanStatusAlert({ status }: ScanStatusAlertProps) {
  const isRunning = status.status === SCAN_STATUS.RUNNING;
  const severity = selectScanAlertSeverity(status);
  const pageProgressText = formatScanPageProgressText(status.pageProgress);
  const progressPercent = selectScanProgressPercent(status.pageProgress);

  return (
    <Alert severity={severity}>
      <Stack spacing={FIELD_GAP}>
        {isRunning && pageProgressText !== null ? (
          <Typography variant="body2">{pageProgressText}</Typography>
        ) : null}

        <Typography variant="body2">
          {isRunning ? formatScanProgressText(status.progress) : formatScanSummaryText(status)}
        </Typography>

        {isRunning ? (
          progressPercent === null ? (
            <LinearProgress />
          ) : (
            <LinearProgress variant="determinate" value={progressPercent} />
          )
        ) : null}
      </Stack>
    </Alert>
  );
}
