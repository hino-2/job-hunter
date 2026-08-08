import { Box, Button, Stack, Typography } from '@mui/material';

import { EMPTY_STATE_PADDING_Y, FIELD_GAP } from '../constants/layout.constants';
import type { EmptyStateProps } from './empty-state.interfaces';

/** Центрированное пустое состояние списка (§7.8). */
export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <Box sx={{ textAlign: 'center', py: EMPTY_STATE_PADDING_Y }}>
      <Stack spacing={FIELD_GAP} sx={{ alignItems: 'center' }}>
        <Typography variant="h6">{title}</Typography>

        {description !== undefined ? (
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        ) : null}

        {actionLabel !== undefined ? (
          <Button variant="contained" onClick={onAction}>
            {actionLabel}
          </Button>
        ) : null}
      </Stack>
    </Box>
  );
}
