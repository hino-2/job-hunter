import type {
  ApplicationSyncResult,
  ApplicationsSyncSummary,
  SyncSummaryItemResponse,
  SyncSummaryResponse,
} from '../applications.interfaces';
import type { SyncOutcomeCounts } from '../applications.type';
import { ApplicationDto } from './application.dto';

/**
 * Короткая строка сводки по записи (§5.2). Отдельного класса под элемент нет:
 * это плоская проекция без собственного поведения.
 */
function toSummaryItem(result: ApplicationSyncResult): SyncSummaryItemResponse {
  return {
    id: result.application.id,
    company: result.application.company,
    outcome: result.outcome,
    message: result.message,
  };
}

/**
 * Ответ POST /api/applications/sync-open (§5.2).
 *
 * items и applications сопоставляются ТОЛЬКО по id: порядок здесь — createdAt ASC,
 * а список записей (§5.1) по умолчанию отдаётся DESC, так что совпадение индексов
 * держится лишь до первой правки любой из сторон.
 */
export class SyncSummaryDto implements SyncSummaryResponse {
  total!: number;
  counts!: SyncOutcomeCounts;
  closed!: number;
  items!: SyncSummaryItemResponse[];
  applications!: ApplicationDto[];

  static fromSummary(summary: ApplicationsSyncSummary): SyncSummaryDto {
    const dto = new SyncSummaryDto();

    dto.total = summary.total;
    dto.counts = summary.counts;
    dto.closed = summary.closed;
    dto.items = summary.results.map((result) => toSummaryItem(result));
    dto.applications = summary.results.map((result) =>
      ApplicationDto.fromEntity(result.application),
    );

    return dto;
  }
}
