import type { DatabaseState, HealthState } from './health.type';

export interface HealthCheckResult {
  status: HealthState;
  db: DatabaseState;
}
