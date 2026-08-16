import { IsIn, IsOptional } from 'class-validator';

import { SCAN_MODES } from '../vacancy-search.constants';
import type { ScanMode } from '../vacancy-search.type';

/**
 * Тело POST /api/vacancy-leads/scan (§5.7, §4.11.12). Поле опционально — пустое
 * тело трактуется как FRESH (DEFAULT_SCAN_MODE), чтобы старую кнопку «Начать
 * поиск» можно было слать без изменений на фронте.
 */
export class StartScanDto {
  @IsOptional()
  @IsIn(SCAN_MODES)
  mode?: ScanMode;
}
