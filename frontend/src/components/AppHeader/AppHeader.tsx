import RefreshIcon from '@mui/icons-material/Refresh';
import { AppBar, Button, LinearProgress, Toolbar, Typography } from '@mui/material';

import { COUNTS_PENDING_PLACEHOLDER } from '../../constants/application.constants';
import {
  APP_BAR_ELEVATION,
  APP_BAR_TITLE_FLEX_GROW,
  FIELD_GAP,
} from '../../constants/layout.constants';
import {
  SYNC_ALL_LABEL,
  SYNC_ALL_PENDING_LABEL,
  SYNC_ALL_PROGRESS_LABEL,
} from '../../constants/sync.constants';
import { ACCENT_COLOR } from '../../constants/theme.constants';
import type { AppHeaderProps } from './app-header.interfaces';

/** Шапка приложения (§7.1): заголовок, массовая синхронизация и счётчик «Открытых: N / M». */
export function AppHeader({
  openCount,
  totalCount,
  isCountsUnknown,
  isSyncingAll,
  onSyncAllOpen,
}: AppHeaderProps) {
  const open = isCountsUnknown ? COUNTS_PENDING_PLACEHOLDER : String(openCount);
  const total = isCountsUnknown ? COUNTS_PENDING_PLACEHOLDER : String(totalCount);

  return (
    <AppBar position="sticky" color="default" elevation={APP_BAR_ELEVATION}>
      <Toolbar variant="dense" sx={{ gap: FIELD_GAP }}>
        <Typography
          variant="h6"
          component="h1"
          sx={{ flexGrow: APP_BAR_TITLE_FLEX_GROW, color: ACCENT_COLOR }}
        >
          Job Hunter
        </Typography>

        <Button
          startIcon={<RefreshIcon />}
          // §7.7: без открытых записей обновлять нечего, а во время прогона — повторный клик.
          disabled={openCount === 0 || isSyncingAll}
          onClick={onSyncAllOpen}
        >
          {isSyncingAll ? SYNC_ALL_PENDING_LABEL : SYNC_ALL_LABEL}
        </Button>

        <Typography variant="body2" color="text.secondary">
          Открытых: {open} / {total}
        </Typography>
      </Toolbar>

      {isSyncingAll ? <LinearProgress aria-label={SYNC_ALL_PROGRESS_LABEL} /> : null}
    </AppBar>
  );
}
