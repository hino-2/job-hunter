import { SCAN_STATUS } from '../vacancy-search.constants';

/** Ответ 202 POST /api/vacancy-leads/scan (§5.7) — прогон запущен, не дожидаясь конца. */
export class ScanAcceptedDto {
  status!: typeof SCAN_STATUS.RUNNING;
  startedAt!: string;

  static fromStartedAt(startedAt: Date): ScanAcceptedDto {
    const dto = new ScanAcceptedDto();

    dto.status = SCAN_STATUS.RUNNING;
    dto.startedAt = startedAt.toISOString();

    return dto;
  }
}
