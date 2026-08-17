import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  SCAN_STATUS,
  SCAN_STOPPED_REASON,
  VACANCY_SCAN_MAX_PAGES_ENV_KEY,
} from './vacancy-search.constants';
import type {
  ScanRunHandle,
  VacancyScanPageProgress,
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
 * на будущее (то же рассуждение, что у планировщика синхронизации, §4.7). Позиция
 * прогона (§3.7, §4.11.12) в память НЕ входит — она в БД (VacancyScanPositionService),
 * этот класс остаётся чисто in-memory и переживает только время жизни процесса.
 *
 * tryStart() — СИНХРОННЫЙ check-and-set: единственная защита от двух одновременных
 * прогонов (§4.11.9 — второй POST /scan отвечает 409). Инвариант: между вызовом
 * tryStart() и `void run(handle)` у вызывающего (vacancy-scan.service.ts) НЕ ДОЛЖНО
 * быть ни одного await, иначе tryStart() перестаёт быть единственным арбитром
 * конкурентности — тот же приём, что у HhRequestThrottle/mapWithConcurrency (слот
 * занимается синхронно).
 *
 * Наружу (snapshot()) уходит КОПИЯ прогресса и pageProgress — иначе GET .../scan/status
 * отдавал бы ссылку на объект, который run() продолжает мутировать между чтением
 * полей ответа.
 */
@Injectable()
export class VacancyScanStateService {
  private readonly maxPages: number;
  private status: ScanStatus = SCAN_STATUS.IDLE;
  private startedAt: Date | null = null;
  private finishedAt: Date | null = null;
  private progress: VacancyScanProgress = createEmptyProgress();
  private stopRequested = false;
  private currentPage: number | null = null;
  private totalPages: number;
  private stoppedReason: ScanStoppedReason | null = null;
  private message: string | null = null;

  constructor(configService: ConfigService) {
    this.maxPages = configService.getOrThrow<number>(VACANCY_SCAN_MAX_PAGES_ENV_KEY);
    this.totalPages = this.maxPages;
  }

  /** null, если прогон уже идёт — вызывающий обязан ответить 409, не запуская run(). */
  tryStart(startPage: number): ScanRunHandle | null {
    if (this.status === SCAN_STATUS.RUNNING) {
      return null;
    }

    this.status = SCAN_STATUS.RUNNING;
    this.startedAt = new Date();
    this.finishedAt = null;
    this.progress = createEmptyProgress();
    this.stopRequested = false;
    this.currentPage = startPage;
    this.totalPages = this.maxPages;
    this.stoppedReason = null;
    this.message = null;

    return {
      increment: (counter, delta = 1) => {
        this.progress[counter] += delta;
      },
      isStopRequested: () => this.stopRequested,
      setCurrentPage: (page) => {
        this.currentPage = page;
      },
      setTotalPages: (total) => {
        this.totalPages = total;
      },
    };
  }

  /** §4.11.12: false, если прогон уже не идёт — вызывающий обязан ответить 409. */
  requestStop(): boolean {
    if (this.status !== SCAN_STATUS.RUNNING) {
      return false;
    }

    this.stopRequested = true;

    return true;
  }

  /** ERROR — статус ERROR, любой другой stoppedReason (в т.ч. STOPPED) — DONE (§5.7, §4.11.12). */
  finish(reason: ScanStoppedReason, message: string | null): void {
    this.status = reason === SCAN_STOPPED_REASON.ERROR ? SCAN_STATUS.ERROR : SCAN_STATUS.DONE;
    this.finishedAt = new Date();
    this.stoppedReason = reason;
    this.message = message;
  }

  snapshot(): VacancyScanStateSnapshot {
    const pageProgress: VacancyScanPageProgress = {
      currentPage: this.currentPage,
      totalPages: this.totalPages,
    };

    return {
      status: this.status,
      startedAt: this.startedAt,
      finishedAt: this.finishedAt,
      progress: { ...this.progress },
      pageProgress,
      stopRequested: this.stopRequested,
      stoppedReason: this.stoppedReason,
      message: this.message,
    };
  }
}
