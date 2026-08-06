import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { DATABASE_PROBE_QUERY } from './health.constants';
import type { HealthCheckResult } from './health.interfaces';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async check(): Promise<HealthCheckResult> {
    try {
      await this.dataSource.query(DATABASE_PROBE_QUERY);

      return { status: 'ok', db: 'up' };
    } catch (error) {
      this.logger.error(
        'Проверка соединения с БД не прошла',
        error instanceof Error ? error.stack : String(error),
      );

      return { status: 'error', db: 'down' };
    }
  }
}
