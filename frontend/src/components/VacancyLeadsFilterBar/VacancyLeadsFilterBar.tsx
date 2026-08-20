import ClearIcon from '@mui/icons-material/Clear';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SearchIcon from '@mui/icons-material/Search';
import SettingsIcon from '@mui/icons-material/Settings';
import StopIcon from '@mui/icons-material/Stop';
import {
  Box,
  Button,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  ToggleButton,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import type { ChangeEvent } from 'react';

import {
  FIELD_GAP,
  SCAN_SOURCE_FIELD_WIDTH_PX,
  SEARCH_FIELD_WIDTH_PX,
} from '../../constants/layout.constants';
import {
  LEAD_SEARCH_SOURCE_OPTIONS,
  SCAN_BUTTON_LABEL,
  SCAN_BUTTON_PENDING_LABEL,
  SCAN_SOURCE_PICKER_LABEL,
  SCAN_STOP_BUTTON_LABEL,
  SCAN_STOP_BUTTON_PENDING_LABEL,
  SETTINGS_BUTTON_LABEL,
  VACANCY_LEADS_HIDDEN_TOGGLE_LABEL,
  VACANCY_LEADS_SEARCH_PLACEHOLDER,
} from '../../constants/vacancy-search.constants';
import type { VacancyLeadSearchSource } from '../../types/vacancy-search.type';
import { formatResumeButtonLabel } from '../../utils/vacancy-scan.utils';
import { SCAN_SOURCE_LABEL_ID } from './vacancy-leads-filter-bar.constants';
import type { VacancyLeadsFilterBarProps } from './vacancy-leads-filter-bar.interfaces';

/**
 * Панель фильтров экрана «Вакансии» (§7.9.1, §7.9.2, §4.11.12): выбор источника выдачи,
 * три кнопки прогона («Начать поиск», «Продолжить», «Остановить»), настройки, поиск,
 * «Скрытые». Кнопки видимы всегда — доступность решают только описанные ниже правила,
 * никакой другой логики в компоненте нет (owner decision).
 */
export function VacancyLeadsFilterBar({
  filters,
  onFiltersChange,
  scanSource,
  onScanSourceChange,
  onScanFresh,
  onScanResume,
  onScanStop,
  isScanRunning,
  isStopRequested,
  isStartPending,
  isStopPending,
  resume,
  onOpenSettings,
}: VacancyLeadsFilterBarProps) {
  const handleScanSourceChange = (event: SelectChangeEvent<VacancyLeadSearchSource>) => {
    onScanSourceChange(event.target.value);
  };

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
      {/*
        Источник идёт первым: он определяет, что сделают обе кнопки старта, и читается
        раньше них. Дизейблится по тем же условиям, что «Начать»/«Продолжить» (§7.9.2):
        прогон один на все источники, и смена значения на лету рассинхронизировала бы
        подпись «Продолжить» с уже идущим прогоном. Флаг стоит на FormControl, а не на
        Select: только через его контекст InputLabel узнаёт о блокировке и гаснет вместе
        с контролом, иначе подпись оставалась бы в полном контрасте над серым полем.
      */}
      <FormControl
        sx={{ width: SCAN_SOURCE_FIELD_WIDTH_PX }}
        disabled={isScanRunning || isStartPending}
      >
        <InputLabel id={SCAN_SOURCE_LABEL_ID}>{SCAN_SOURCE_PICKER_LABEL}</InputLabel>
        <Select<VacancyLeadSearchSource>
          labelId={SCAN_SOURCE_LABEL_ID}
          label={SCAN_SOURCE_PICKER_LABEL}
          value={scanSource}
          onChange={handleScanSourceChange}
        >
          {LEAD_SEARCH_SOURCE_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Button
        variant="contained"
        startIcon={<SearchIcon />}
        disabled={isScanRunning || isStartPending}
        onClick={onScanFresh}
      >
        {isScanRunning ? SCAN_BUTTON_PENDING_LABEL : SCAN_BUTTON_LABEL}
      </Button>

      <Button
        variant="outlined"
        startIcon={<PlayArrowIcon />}
        disabled={isScanRunning || isStartPending || !resume.available}
        onClick={onScanResume}
      >
        {formatResumeButtonLabel(resume)}
      </Button>

      <Button
        variant="outlined"
        color="warning"
        startIcon={<StopIcon />}
        disabled={!isScanRunning || isStopRequested || isStopPending}
        onClick={onScanStop}
      >
        {isStopRequested ? SCAN_STOP_BUTTON_PENDING_LABEL : SCAN_STOP_BUTTON_LABEL}
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
