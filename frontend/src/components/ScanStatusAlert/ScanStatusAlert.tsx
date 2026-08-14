import { Alert, LinearProgress, Stack, Typography } from '@mui/material';

import { FIELD_GAP } from '../../constants/layout.constants';
import { SCAN_STATUS } from '../../constants/vacancy-search.constants';
import { formatScanProgressText, formatScanSummaryText, selectScanAlertSeverity } from '../../utils/vacancy-scan.utils';
import type { ScanStatusAlertProps } from './scan-status-alert.interfaces';

/**
 * Прогресс/итог прогона поиска (§7.9.2): один и тот же Alert, во время прогона —
 * LinearProgress со счётчиками, после остановки — итоговая сводка с человекочитаемой
 * причиной. Кнопки закрытия нет намеренно: §7.9.2 требует показывать статус последнего
 * прогона и при монтировании экрана, а не только пока открыта вкладка, где он запущен.
 */
export function ScanStatusAlert({ status }: ScanStatusAlertProps) {
  const isRunning = status.status === SCAN_STATUS.RUNNING;
  const severity = selectScanAlertSeverity(status);

  return (
    <Alert severity={severity}>
      <Stack spacing={FIELD_GAP}>
        <Typography variant="body2">
          {isRunning ? formatScanProgressText(status.progress) : formatScanSummaryText(status)}
        </Typography>

        {isRunning ? <LinearProgress /> : null}
      </Stack>
    </Alert>
  );
}
