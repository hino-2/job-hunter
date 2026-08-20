import { IsIn, IsOptional } from 'class-validator';

import { VACANCY_LEAD_SEARCH_SOURCES } from '../../vacancies/vacancies.constants';
import type { VacancyLeadSearchSource } from '../../vacancies/vacancies.type';
import { SCAN_MODES } from '../vacancy-search.constants';
import type { ScanMode } from '../vacancy-search.type';

/**
 * Тело POST /api/vacancy-leads/scan (§5.7, §4.11.12). Оба поля опциональны — пустое
 * тело трактуется как FRESH по hh.ru (DEFAULT_SCAN_MODE/DEFAULT_SCAN_SOURCE), чтобы
 * старую кнопку «Начать поиск» можно было слать без изменений на фронте.
 */
export class StartScanDto {
  @IsOptional()
  @IsIn(SCAN_MODES)
  mode?: ScanMode;

  /**
   * §5.7: источник поиска лидов. Список — VACANCY_LEAD_SEARCH_SOURCES, а не все
   * значения VacancySource: getmatch.ru выдачи для поиска не даёт, и 'GETMATCH'
   * обязан получить 400, а не 500 из реестра.
   */
  @IsOptional()
  @IsIn(VACANCY_LEAD_SEARCH_SOURCES)
  source?: VacancyLeadSearchSource;
}
