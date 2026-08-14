import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';
import SettingsIcon from '@mui/icons-material/Settings';
import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  TextField,
  ToggleButton,
} from '@mui/material';
import type { ChangeEvent } from 'react';

import { FIELD_GAP, SEARCH_FIELD_WIDTH_PX } from '../../constants/layout.constants';
import {
  SCAN_BUTTON_LABEL,
  SCAN_BUTTON_PENDING_LABEL,
  SETTINGS_BUTTON_LABEL,
  VACANCY_LEADS_HIDDEN_TOGGLE_LABEL,
  VACANCY_LEADS_SEARCH_PLACEHOLDER,
} from '../../constants/vacancy-search.constants';
import type { VacancyLeadsFilterBarProps } from './vacancy-leads-filter-bar.interfaces';

/** Панель фильтров экрана «Вакансии» (§7.9.1): прогон, настройки, поиск, «Скрытые». */
export function VacancyLeadsFilterBar({
  filters,
  onFiltersChange,
  onScan,
  isScanRunning,
  onOpenSettings,
}: VacancyLeadsFilterBarProps) {
  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ ...filters, search: event.target.value });
  };

  const handleSearchClear = () => {
    onFiltersChange({ ...filters, search: '' });
  };

  const handleHiddenToggle = () => {
    onFiltersChange({ ...filters, showHiddenOnly: !filters.showHiddenOnly });
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: FIELD_GAP, flexWrap: 'wrap' }}>
      <Button
        variant="contained"
        startIcon={<SearchIcon />}
        disabled={isScanRunning}
        onClick={onScan}
      >
        {isScanRunning ? SCAN_BUTTON_PENDING_LABEL : SCAN_BUTTON_LABEL}
      </Button>

      <Button variant="outlined" startIcon={<SettingsIcon />} onClick={onOpenSettings}>
        {SETTINGS_BUTTON_LABEL}
      </Button>

      <TextField
        placeholder={VACANCY_LEADS_SEARCH_PLACEHOLDER}
        value={filters.search}
        onChange={handleSearchChange}
        sx={{ width: SEARCH_FIELD_WIDTH_PX }}
        slotProps={{
          input: {
            'aria-label': VACANCY_LEADS_SEARCH_PLACEHOLDER,
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: (
              // Кнопка занимает место всегда — иначе ширина поля скачет на первом символе.
              <InputAdornment
                position="end"
                sx={{ visibility: filters.search ? 'visible' : 'hidden' }}
              >
                <IconButton
                  aria-label="Очистить поиск"
                  edge="end"
                  size="small"
                  onClick={handleSearchClear}
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
      />

      <ToggleButton
        value="hidden"
        selected={filters.showHiddenOnly}
        onChange={handleHiddenToggle}
        aria-label={VACANCY_LEADS_HIDDEN_TOGGLE_LABEL}
      >
        {VACANCY_LEADS_HIDDEN_TOGGLE_LABEL}
      </ToggleButton>
    </Box>
  );
}
