import { HttpStatus } from '@nestjs/common';
import type { Agent } from 'supertest';
import type { DataSource } from 'typeorm';

import type { ApplicationResponse } from '../src/applications/applications.interfaces';
import type { CreateApplicationDto } from '../src/applications/dto/create-application.dto';
import {
  APPLICATIONS_ENDPOINT,
  DEFAULT_FIXTURE_COMPANY,
  SET_CREATED_AT_QUERY,
} from './test.constants';

/** Путь к одной записи; собирается из констант, чтобы не дублировать маршрут в спеках. */
export function applicationEndpoint(id: string): string {
  return `${APPLICATIONS_ENDPOINT}/${id}`;
}

export function buildCreatePayload(
  overrides?: Partial<CreateApplicationDto>,
): CreateApplicationDto {
  return { company: DEFAULT_FIXTURE_COMPANY, ...overrides };
}

export async function seedApplication(
  api: Agent,
  payload: CreateApplicationDto,
): Promise<ApplicationResponse> {
  const response = await api.post(APPLICATIONS_ENDPOINT).send(payload).expect(HttpStatus.CREATED);

  return response.body as ApplicationResponse;
}

/**
 * Прямой UPDATE created_at: колонка заполняется базой, а тесты сортировки
 * должны быть детерминированными, а не зависеть от того, что две записи
 * созданы в одну миллисекунду.
 */
export async function setCreatedAt(
  dataSource: DataSource,
  id: string,
  isoDate: string,
): Promise<void> {
  await dataSource.query(SET_CREATED_AT_QUERY, [isoDate, id]);
}
