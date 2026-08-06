import { AppBar, Box, Container, Toolbar, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';

import { fetchHealth } from './api/health.api';
import { BackendStatus } from './components/BackendStatus';
import { CONTAINER_PADDING_X, FIELD_GAP } from './constants/layout.constants';
import { HEALTH_QUERY_KEY } from './constants/query.constants';

export function App() {
  const health = useQuery({
    queryKey: HEALTH_QUERY_KEY,
    queryFn: fetchHealth,
  });

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" color="default" elevation={1}>
        <Toolbar variant="dense" sx={{ gap: FIELD_GAP }}>
          <Typography variant="h6" component="h1" sx={{ flexGrow: 1 }}>
            Job Hunter
          </Typography>
          <BackendStatus
            isPending={health.isPending}
            isError={health.isError}
            databaseUp={health.data?.db === 'up'}
          />
        </Toolbar>
      </AppBar>

      <Container maxWidth={false} sx={{ px: CONTAINER_PADDING_X, py: CONTAINER_PADDING_X }}>
        <Typography variant="body1" color="text.secondary">
          Инфраструктура развёрнута. Список вакансий появится здесь — см. SPECIFICATION.md, §7.2.
        </Typography>
      </Container>
    </Box>
  );
}
