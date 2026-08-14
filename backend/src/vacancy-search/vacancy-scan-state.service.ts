import { Injectable } from '@nestjs/common';

import { SCAN_STATUS, SCAN_STOPPED_REASON } from './vacancy-search.constants';
import type {
  ScanRunHandle,
  VacancyScanProgress,
  VacancyScanStateSnapshot,
} from './vacancy-search.interfaces';
import type { ScanStatus, ScanStoppedReason } from './vacancy-search.type';

function createEmptyProgress(): VacancyScanProgress {
  return {
    pagesFetched: 0,
    itemsSeen: 0,
    skippedInvalid: 0,
    skippedOld: 0,
    skippedExcluded: 0,
    rejectedTitle: 0,
    duplicates: 0,
    descriptionsFailed: 0,
    rejectedDescription: 0,
    created: 0,
    failed: 0,
    aiFallbacks: 0,
  };
}

/**
 * §4.11.9: статус прогона поиска живёт в памяти процесса — единственный экземпляр
 * `api` (§9.1), Node однопоточен, отдельная таблица прогонов была бы абстракцией
 * на будущее (то же рассуждение, что у планировщика синхронизации, §4.7).
 *
 * tryStart() — СИНХРОННЫЙ check-and-set: единственная защита от двух одновременных
 * прогонов (§4.11.9 — второй POST /scan отвечает 409). Резервирование состояния
 * происходит ДО первого await у вызывающего (vacancy-scan.service.ts: tryStart(),
 * затем ConflictException при null, иначе void run(handle)) — тот же приём, что
 * у HhRequestThrottle/mapWithConcurrency (слот занимается синхронно).
 *
 * Наружу (snapshot()) уходит КОПИЯ прогресса — иначе GET .../scan/status отдавал бы
 * ссылку на объект, который run() продолжает мутировать между чтением полей ответа.
 */
@Injectable()
export class VacancyScanStateService {
  private status: ScanStatus = SCAN_STATUS.IDLE;
  private startedAt: Date | null = null;
  private finishedAt: Date | null = null;
  private progress: VacancyScanProgress = createEmptyProgress();
  private stoppedReason: ScanStoppedReason | null = null;
  private message: string | null = null;

  /** null, если прогон уже идёт — вызывающий обязан ответить 409, не запуская run(). */
  tryStart(): ScanRunHandle | null {
    if (this.status === SCAN_STATUS.RUNNING) {
      return null;
    }

    this.status = SCAN_STATUS.RUNNING;
    this.startedAt = new Date();
    this.finishedAt = null;
    this.progress = createEmptyProgress();
    this.stoppedReason = null;
    this.message = null;

    return {
      increment: (counter, delta = 1) => {
        this.progress[counter] += delta;
      },
    };
  }

  /** ERROR — статус ERROR, любой другой stoppedReason — DONE (§5.7). */
  finish(reason: ScanStoppedReason, message: string | null): void {
    this.status = reason === SCAN_STOPPED_REASON.ERROR ? SCAN_STATUS.ERROR : SCAN_STATUS.DONE;
    this.finishedAt = new Date();
    this.stoppedReason = reason;
    this.message = message;
  }

  snapshot(): VacancyScanStateSnapshot {
    return {
      status: this.status,
      startedAt: this.startedAt,
      finishedAt: this.finishedAt,
      progress: { ...this.progress },
      stoppedReason: this.stoppedReason,
      message: this.message,
    };
  }
}
