import AddIcon from '@mui/icons-material/Add';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
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
  ToggleButtonGroup,
  Tooltip,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import type { ChangeEvent, MouseEvent } from 'react';

import {
  APPLICATION_ORDER,
  APPLICATION_SORT_LABELS,
  APPLICATION_SORT_ORDER_LIST,
  STATUS_FILTER_LABELS,
  STATUS_FILTER_ORDER,
} from '../../constants/application.constants';
import {
  FIELD_GAP,
  SEARCH_FIELD_WIDTH_PX,
  SORT_FIELD_WIDTH_PX,
} from '../../constants/layout.constants';
import type { ApplicationSortField, StatusFilter } from '../../types/application.type';
import { SORT_LABEL_ID } from './filter-bar.constants';
import type { FilterBarProps } from './filter-bar.interfaces';

/** Панель фильтров (§7.1, §7.2.4): статус, поиск, сортировка, групповое раскрытие. */
export function FilterBar({
  filters,
  onFiltersChange,
  isAllExpanded,
  onToggleExpandAll,
  onAdd,
}: FilterBarProps) {
  const isAscending = filters.order === APPLICATION_ORDER.ASC;

  const handleStatusChange = (_event: MouseEvent<HTMLElement>, value: StatusFilter | null) => {
    // exclusive-группа отдаёт null при клике по уже выбранной кнопке. Такой клик
    // игнорируем, иначе фильтр «схлопнулся» бы в отсутствующее значение.
    if (value === null) {
      return;
    }

    onFiltersChange({ ...filters, status: value });
  };

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ ...filters, search: event.target.value });
  };

  const handleSearchClear = () => {
    onFiltersChange({ ...filters, search: '' });
  };

  const handleSortChange = (event: SelectChangeEvent<ApplicationSortField>) => {
    onFiltersChange({ ...filters, sort: event.target.value });
  };

  const handleOrderToggle = () => {
    onFiltersChange({
      ...filters,
      order: isAscending ? APPLICATION_ORDER.DESC : APPLICATION_ORDER.ASC,
    });
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: FIELD_GAP, flexWrap: 'wrap' }}>
      <ToggleButtonGroup exclusive value={filters.status} onChange={handleStatusChange}>
        {STATUS_FILTER_ORDER.map((value) => (
          <ToggleButton key={value} value={value}>
            {STATUS_FILTER_LABELS[value]}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <TextField
        placeholder="Поиск…"
        value={filters.search}
        onChange={handleSearchChange}
        sx={{ width: SEARCH_FIELD_WIDTH_PX }}
        slotProps={{
          input: {
            // У поля нет видимой подписи, а placeholder доступным именем не является.
            'aria-label': 'Поиск',
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: (
              // Кнопка занимает место всегда: условный рендер менял бы ширину поля
              // ввода на первом же символе и дёргал бы текст под кареткой.
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

      <FormControl sx={{ width: SORT_FIELD_WIDTH_PX }}>
        <InputLabel id={SORT_LABEL_ID}>Сортировка</InputLabel>
        <Select<ApplicationSortField>
          labelId={SORT_LABEL_ID}
          label="Сортировка"
          value={filters.sort}
          onChange={handleSortChange}
        >
          {APPLICATION_SORT_ORDER_LIST.map((field) => (
            <MenuItem key={field} value={field}>
              {APPLICATION_SORT_LABELS[field]}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Tooltip title={isAscending ? 'По возрастанию' : 'По убыванию'}>
        <IconButton aria-label="Направление сортировки" onClick={handleOrderToggle}>
          {isAscending ? (
            <ArrowUpwardIcon fontSize="small" />
          ) : (
            <ArrowDownwardIcon fontSize="small" />
          )}
        </IconButton>
      </Tooltip>

      <Tooltip title={isAllExpanded ? 'Свернуть все' : 'Развернуть все'}>
        <IconButton
          aria-label={isAllExpanded ? 'Свернуть все' : 'Развернуть все'}
          onClick={onToggleExpandAll}
        >
          {isAllExpanded ? (
            <UnfoldLessIcon fontSize="small" />
          ) : (
            <UnfoldMoreIcon fontSize="small" />
          )}
        </IconButton>
      </Tooltip>

      <Button variant="contained" startIcon={<AddIcon />} onClick={onAdd}>
        Добавить
      </Button>
    </Box>
  );
}
