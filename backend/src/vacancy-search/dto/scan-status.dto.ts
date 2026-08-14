import type { VacancyScanProgress, VacancyScanStateSnapshot } from '../vacancy-search.interfaces';
import type { ScanStatus, ScanStoppedReason } from '../vacancy-search.type';

function toIsoOrNull(value: Date | null): string | null {
  return value === null ? null : value.toISOString();
}

/**
 * Ответ GET /api/vacancy-leads/scan/status (§5.7): статус, живые счётчики прогресса
 * (§4.11.11) и итог последнего прогона. Тот же снимок обслуживает и «во время
 * прогона», и «после» — разница только в stoppedReason/message (null, пока RUNNING).
 */
export class ScanStatusDto {
  status!: ScanStatus;
  startedAt!: string | null;
  finishedAt!: string | null;
  progress!: VacancyScanProgress;
  stoppedReason!: ScanStoppedReason | null;
  message!: string | null;

  static fromState(snapshot: VacancyScanStateSnapshot): ScanStatusDto {
    const dto = new ScanStatusDto();

    dto.status = snapshot.status;
    dto.startedAt = toIsoOrNull(snapshot.startedAt);
    dto.finishedAt = toIsoOrNull(snapshot.finishedAt);
    // Копия, а не ссылка — snapshot() отдаёт её уже копией, здесь ещё один спред
    // на случай, если внутреннее представление когда-нибудь перестанет быть плоским.
    dto.progress = { ...snapshot.progress };
    dto.stoppedReason = snapshot.stoppedReason;
    dto.message = snapshot.message;

    return dto;
  }
}
