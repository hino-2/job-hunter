import { Controller, Get } from '@nestjs/common';

import { Public } from '../auth/auth.decorators';
import { HEALTH_ROUTE } from './health.constants';
import type { HealthCheckResult } from './health.interfaces';
import { HealthService } from './health.service';

/**
 * GET /api/health — используется healthcheck'ом контейнера.
 * Единственный эндпоинт без Basic Auth (§5.4), поэтому и единственный с @Public().
 *
 * @Public() стоит на методе, а не на классе: если тут появится второй эндпоинт,
 * он не должен молча оказаться открытым (guard читает и class-level метаданные).
 */
@Controller(HEALTH_ROUTE)
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  check(): Promise<HealthCheckResult> {
    return this.healthService.check();
  }
}
