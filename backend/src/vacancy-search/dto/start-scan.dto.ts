import { IsIn, IsOptional } from 'class-validator';

import { SCAN_MODES, SCAN_SOURCE_SELECTIONS } from '../vacancy-search.constants';
import type { ScanMode, ScanSourceSelection } from '../vacancy-search.type';

/**
 * Тело POST /api/vacancy-leads/scan (§5.7, §4.11.0, §4.11.12). Оба поля опциональны —
 * пустое тело трактуется как FRESH по всем источникам поиска лидов сразу
 * (DEFAULT_SCAN_MODE/DEFAULT_SCAN_SOURCE = SCAN_SOURCE_ALL) — «искать по всем
 * источникам» это дефолтное поведение, а не отдельная опция.
 */
export class StartScanDto {
  @IsOptional()
  @IsIn(SCAN_MODES)
  mode?: ScanMode;

  /**
   * §5.7/§4.11.0: источник поиска лидов либо сентинел 'ALL' — по одному скалярному
   * полю, не массиву и не булеву флагу. Список — SCAN_SOURCE_SELECTIONS
   * (VACANCY_LEAD_SEARCH_SOURCES + 'ALL', теперь включает и 'COMPANY_SITE', §4.14),
   * а не все значения VacancySource: getmatch.ru выдачи для поиска не даёт, и
   * 'GETMATCH' обязан получить 400, а не 500 из реестра.
   */
  @IsOptional()
  @IsIn(SCAN_SOURCE_SELECTIONS)
  source?: ScanSourceSelection;
}
