import type {
  VacancyScanPageProgress,
  VacancyScanProgress,
  VacancyScanResumeState,
  VacancyScanStateSnapshot,
} from '../vacancy-search.interfaces';
import type { ScanStatus, ScanStoppedReason } from '../vacancy-search.type';

function toIsoOrNull(value: Date | null): string | null {
  return value === null ? null : value.toISOString();
}

/**
 * Ответ GET /api/vacancy-leads/scan/status (§5.7): статус, живые счётчики прогресса
 * (§4.11.11), индикатор страницы и возможность продолжить (§4.11.12). Тот же снимок
 * обслуживает и «во время прогона», и «после» — разница только в
 * stoppedReason/message (null, пока RUNNING).
 */
export class ScanStatusDto {
  status!: ScanStatus;
  startedAt!: string | null;
  finishedAt!: string | null;
  progress!: VacancyScanProgress;
  pageProgress!: VacancyScanPageProgress;
  stopRequested!: boolean;
  resume!: VacancyScanResumeState;
  stoppedReason!: ScanStoppedReason | null;
  message!: string | null;

  static fromState(snapshot: VacancyScanStateSnapshot, resume: VacancyScanResumeState): ScanStatusDto {
    const dto = new ScanStatusDto();

    dto.status = snapshot.status;
    dto.startedAt = toIsoOrNull(snapshot.startedAt);
    dto.finishedAt = toIsoOrNull(snapshot.finishedAt);
    // Копия, а не ссылка — snapshot() отдаёт её уже копией, здесь ещё один спред
    // на случай, если внутреннее представление когда-нибудь перестанет быть плоским.
    dto.progress = { ...snapshot.progress };
    dto.pageProgress = { ...snapshot.pageProgress };
    dto.stopRequested = snapshot.stopRequested;
    dto.resume = resume;
    dto.stoppedReason = snapshot.stoppedReason;
    dto.message = snapshot.message;

    return dto;
  }
}
