import { Controller, Get } from '@nestjs/common';

import { HEALTH_ROUTE } from './health.constants';
import type { HealthCheckResult } from './health.interfaces';
import { HealthService } from './health.service';

/**
 * GET /api/health — используется healthcheck'ом контейнера.
 * Единственный эндпоинт, который останется без Basic Auth.
 */
@Controller(HEALTH_ROUTE)
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  check(): Promise<HealthCheckResult> {
    return this.healthService.check();
  }
}
