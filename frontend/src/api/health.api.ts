import { HEALTH_ENDPOINT } from '../constants/api.constants';
import type { HealthCheckResult } from '../types/health.interfaces';
import { apiClient } from './client';

export async function fetchHealth(): Promise<HealthCheckResult> {
  const response = await apiClient.get<HealthCheckResult>(HEALTH_ENDPOINT);

  return response.data;
}
