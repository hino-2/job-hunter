import { SCAN_STATUS } from '../vacancy-search.constants';

/** Ответ 202 POST /api/vacancy-leads/scan/stop (§5.7, §4.11.12) — остановка запрошена, статус ещё RUNNING. */
export class ScanStopAcceptedDto {
  status!: typeof SCAN_STATUS.RUNNING;
  stopRequested!: true;

  static create(): ScanStopAcceptedDto {
    const dto = new ScanStopAcceptedDto();

    dto.status = SCAN_STATUS.RUNNING;
    dto.stopRequested = true;

    return dto;
  }
}
