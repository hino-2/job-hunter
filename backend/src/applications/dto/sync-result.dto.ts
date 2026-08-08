import type { ApplicationSyncResult, SyncResultResponse } from '../applications.interfaces';
import type { SyncOutcome } from '../applications.type';
import { ApplicationDto } from './application.dto';

/**
 * Ответ POST /api/applications/:id/sync (§5.2). Неуспешный outcome — это тоже 200:
 * результат операции, а не ошибка HTTP-запроса.
 *
 * Маппинг руками, как в ApplicationDto: внешний контракт должен быть виден целиком.
 */
export class SyncResultDto implements SyncResultResponse {
  outcome!: SyncOutcome;
  message!: string | null;
  application!: ApplicationDto;

  static fromResult(result: ApplicationSyncResult): SyncResultDto {
    const dto = new SyncResultDto();

    dto.outcome = result.outcome;
    dto.message = result.message;
    dto.application = ApplicationDto.fromEntity(result.application);

    return dto;
  }
}
