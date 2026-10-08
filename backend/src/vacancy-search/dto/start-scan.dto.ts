import { ArrayNotEmpty, ArrayUnique, IsArray, IsIn, IsOptional } from 'class-validator';

import { VACANCY_LEAD_SEARCH_SOURCES } from '../../vacancies/vacancies.constants';
import type { VacancyLeadSearchSource } from '../../vacancies/vacancies.type';
import { SCAN_MODES } from '../vacancy-search.constants';
import type { ScanMode } from '../vacancy-search.type';

/**
 * Тело POST /api/vacancy-leads/scan (§5.7, §4.11.0, §4.11.12). Оба поля опциональны —
 * пустое тело трактуется как FRESH по всем источникам поиска лидов
 * (DEFAULT_SCAN_MODE/DEFAULT_SCAN_SOURCES).
 */
export class StartScanDto {
  @IsOptional()
  @IsIn(SCAN_MODES)
  mode?: ScanMode;

  /**
   * §5.7/§4.11.0: какие источники поиска лидов обходит прогон. Отсутствие поля — все
   * источники. Пустой массив — 400: прогон без работы это ошибка клиента. Порядок
   * элементов не важен — сервис сам ставит их в канонический порядок
   * VACANCY_LEAD_SEARCH_SOURCES; дубли отсекает @ArrayUnique. Список допустимых —
   * VACANCY_LEAD_SEARCH_SOURCES, а не все значения VacancySource: getmatch.ru выдачи для
   * поиска не даёт, и 'GETMATCH' обязан получить 400, а не 500 из реестра.
   */
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsIn(VACANCY_LEAD_SEARCH_SOURCES, { each: true })
  sources?: VacancyLeadSearchSource[];
}
