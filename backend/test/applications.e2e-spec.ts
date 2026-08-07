import { HttpStatus } from '@nestjs/common';

import type { ApplicationResponse } from '../src/applications/applications.interfaces';
import type { ErrorResponse } from '../src/common/common.interfaces';
import {
  applicationEndpoint,
  buildCreatePayload,
  seedApplication,
  setCreatedAt,
} from './applications.fixtures';
import { createE2eTestContext } from './e2e-app.factory';
import type { E2eTestContext } from './e2e.interfaces';
import {
  APPLICATIONS_ENDPOINT,
  EXPECTED_RESULT_VALUES_MESSAGE,
  EXPECTED_STATUS_VALUES_MESSAGE,
  ISO_UTC_PATTERN,
  MALFORMED_UUID,
  MISSING_UUID,
  NON_HH_URL,
  UPDATED_AT_DELAY_MS,
  UUID_PATTERN,
} from './test.constants';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('Applications (e2e)', () => {
  let ctx: E2eTestContext;

  beforeAll(async () => {
    ctx = await createE2eTestContext();
  });

  afterAll(async () => {
    await ctx.close();
  });

  beforeEach(async () => {
    await ctx.resetDatabase();
  });

  describe('POST /api/applications', () => {
    it('создаёт запись по одной только компании, подставляя дефолты', async () => {
      const response = await ctx.api
        .post(APPLICATIONS_ENDPOINT)
        .send(buildCreatePayload())
        .expect(HttpStatus.CREATED);
      const body = response.body as ApplicationResponse;

      expect(body.id).toMatch(UUID_PATTERN);
      expect(body.company).toBe('Acme');
      expect(body.status).toBe('OPEN');
      expect(body.result).toBe('IN_PROGRESS');
      expect(body.createdAt).toMatch(ISO_UTC_PATTERN);
      expect(body.updatedAt).toMatch(ISO_UTC_PATTERN);

      expect(body.position).toBeNull();
      expect(body.vacancyUrl).toBeNull();
      expect(body.resumeUrl).toBeNull();
      expect(body.employerContact).toBeNull();
      expect(body.hrInterviewAt).toBeNull();
      expect(body.techInterviewAt).toBeNull();
      expect(body.notes).toBeNull();
      expect(body.hhVacancyId).toBeNull();
      expect(body.hhArchived).toBeNull();
      expect(body.hhVacancyType).toBeNull();
      expect(body.lastSyncedAt).toBeNull();
      expect(body.lastSyncOutcome).toBeNull();
      expect(body.lastSyncError).toBeNull();
    });

    it('возвращает все присланные поля, нормализуя даты к UTC', async () => {
      const created = await seedApplication(
        ctx.api,
        buildCreatePayload({
          company: 'Globex',
          position: 'Node.js Developer',
          vacancyUrl: 'https://hh.ru/vacancy/12345678',
          resumeUrl: 'https://hh.ru/resume/abc',
          status: 'CLOSED',
          result: 'OFFER',
          employerContact: 'HR Ольга, tg @olga',
          hrInterviewAt: '2026-08-10T09:00:00.000Z',
          techInterviewAt: '2026-08-11T12:00:00+03:00',
          notes: 'Просили тестовое',
        }),
      );

      expect(created.company).toBe('Globex');
      expect(created.position).toBe('Node.js Developer');
      expect(created.vacancyUrl).toBe('https://hh.ru/vacancy/12345678');
      expect(created.resumeUrl).toBe('https://hh.ru/resume/abc');
      expect(created.status).toBe('CLOSED');
      expect(created.result).toBe('OFFER');
      expect(created.employerContact).toBe('HR Ольга, tg @olga');
      expect(created.hrInterviewAt).toBe('2026-08-10T09:00:00.000Z');
      expect(created.techInterviewAt).toBe('2026-08-11T09:00:00.000Z');
      expect(created.notes).toBe('Просили тестовое');
      // §4.2: id вакансии вычисляет бэкенд из vacancyUrl.
      expect(created.hhVacancyId).toBe('12345678');
    });

    it('вычисляет hhVacancyId из ссылки без схемы и с query', async () => {
      const created = await seedApplication(
        ctx.api,
        buildCreatePayload({ vacancyUrl: 'spb.hh.ru/vacancy/87654321?from=vacancy_search_list' }),
      );

      expect(created.hhVacancyId).toBe('87654321');
    });

    it('оставляет hhVacancyId пустым для ссылки не на вакансию hh.ru', async () => {
      const created = await seedApplication(
        ctx.api,
        buildCreatePayload({ vacancyUrl: NON_HH_URL }),
      );

      expect(created.vacancyUrl).toBe(NON_HH_URL);
      expect(created.hhVacancyId).toBeNull();
    });

    it('обрезает пробелы у строк и превращает пустую строку в null', async () => {
      const created = await seedApplication(
        ctx.api,
        buildCreatePayload({ company: '  Acme  ', notes: '', position: '  Backend  ' }),
      );

      expect(created.company).toBe('Acme');
      expect(created.position).toBe('Backend');
      expect(created.notes).toBeNull();
    });
  });

  describe('POST /api/applications — валидация', () => {
    it('отклоняет отсутствующую company', async () => {
      const response = await ctx.api
        .post(APPLICATIONS_ENDPOINT)
        .send({})
        .expect(HttpStatus.BAD_REQUEST);
      const body = response.body as ErrorResponse;

      expect(body.statusCode).toBe(HttpStatus.BAD_REQUEST);
      expect(body.error).toBe('Bad Request');
      expect(body.message).toContain('company should not be empty');
    });

    it('отклоняет company из одних пробелов', async () => {
      const response = await ctx.api
        .post(APPLICATIONS_ENDPOINT)
        .send({ company: '   ' })
        .expect(HttpStatus.BAD_REQUEST);
      const body = response.body as ErrorResponse;

      expect(body.message).toContain('company should not be empty');
    });

    it('отклоняет company длиннее 255 символов', async () => {
      const response = await ctx.api
        .post(APPLICATIONS_ENDPOINT)
        .send({ company: 'a'.repeat(256) })
        .expect(HttpStatus.BAD_REQUEST);
      const body = response.body as ErrorResponse;

      expect(body.message).toContain('company must be shorter than or equal to 255 characters');
    });

    it('отклоняет неизвестное поле', async () => {
      const response = await ctx.api
        .post(APPLICATIONS_ENDPOINT)
        .send({ company: 'Acme', bogus: 1 })
        .expect(HttpStatus.BAD_REQUEST);
      const body = response.body as ErrorResponse;

      expect(body.message).toContain('property bogus should not exist');
    });

    it('отклоняет попытку прислать hhVacancyId — его считает бэкенд', async () => {
      const response = await ctx.api
        .post(APPLICATIONS_ENDPOINT)
        .send({ company: 'Acme', hhVacancyId: '12345678' })
        .expect(HttpStatus.BAD_REQUEST);
      const body = response.body as ErrorResponse;

      expect(body.message).toContain('property hhVacancyId should not exist');
    });

    it('перечисляет в ошибке ровно допустимые значения status', async () => {
      const response = await ctx.api
        .post(APPLICATIONS_ENDPOINT)
        .send({ company: 'Acme', status: 'WRONG' })
        .expect(HttpStatus.BAD_REQUEST);
      const body = response.body as ErrorResponse;

      expect(body.message).toEqual([EXPECTED_STATUS_VALUES_MESSAGE]);
    });

    it('перечисляет в ошибке ровно допустимые значения result', async () => {
      const response = await ctx.api
        .post(APPLICATIONS_ENDPOINT)
        .send({ company: 'Acme', result: 'WRONG' })
        .expect(HttpStatus.BAD_REQUEST);
      const body = response.body as ErrorResponse;

      expect(body.message).toEqual([EXPECTED_RESULT_VALUES_MESSAGE]);
    });

    it('отклоняет явный null в non-nullable status', async () => {
      await ctx.api
        .post(APPLICATIONS_ENDPOINT)
        .send({ company: 'Acme', status: null })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('отклоняет невалидный URL вакансии', async () => {
      const response = await ctx.api
        .post(APPLICATIONS_ENDPOINT)
        .send({ company: 'Acme', vacancyUrl: 'not-a-url' })
        .expect(HttpStatus.BAD_REQUEST);
      const body = response.body as ErrorResponse;

      expect(body.message).toContain('vacancyUrl must be a URL address');
    });

    it('отклоняет дату не в формате ISO 8601', async () => {
      const response = await ctx.api
        .post(APPLICATIONS_ENDPOINT)
        .send({ company: 'Acme', hrInterviewAt: '10.08.2026' })
        .expect(HttpStatus.BAD_REQUEST);
      const body = response.body as ErrorResponse;

      expect(body.message).toContain('hrInterviewAt must be a valid ISO 8601 date string');
    });
  });

  describe('GET /api/applications', () => {
    it('по умолчанию сортирует по createdAt desc', async () => {
      const oldest = await seedApplication(ctx.api, buildCreatePayload({ company: 'Oldest' }));
      const middle = await seedApplication(ctx.api, buildCreatePayload({ company: 'Middle' }));
      const newest = await seedApplication(ctx.api, buildCreatePayload({ company: 'Newest' }));

      await setCreatedAt(ctx.dataSource, oldest.id, '2026-01-01T00:00:00.000Z');
      await setCreatedAt(ctx.dataSource, middle.id, '2026-02-01T00:00:00.000Z');
      await setCreatedAt(ctx.dataSource, newest.id, '2026-03-01T00:00:00.000Z');

      const response = await ctx.api.get(APPLICATIONS_ENDPOINT).expect(HttpStatus.OK);
      const body = response.body as ApplicationResponse[];

      expect(body.map((item) => item.company)).toEqual(['Newest', 'Middle', 'Oldest']);
    });

    it('сортирует по company asc', async () => {
      await seedApplication(ctx.api, buildCreatePayload({ company: 'Charlie' }));
      await seedApplication(ctx.api, buildCreatePayload({ company: 'Alpha' }));
      await seedApplication(ctx.api, buildCreatePayload({ company: 'Bravo' }));

      const response = await ctx.api
        .get(APPLICATIONS_ENDPOINT)
        .query({ sort: 'company', order: 'asc' })
        .expect(HttpStatus.OK);
      const body = response.body as ApplicationResponse[];

      expect(body.map((item) => item.company)).toEqual(['Alpha', 'Bravo', 'Charlie']);
    });

    it('фильтрует по status', async () => {
      await seedApplication(ctx.api, buildCreatePayload({ company: 'Open Co' }));
      await seedApplication(
        ctx.api,
        buildCreatePayload({ company: 'Closed Co', status: 'CLOSED' }),
      );

      const response = await ctx.api
        .get(APPLICATIONS_ENDPOINT)
        .query({ status: 'CLOSED' })
        .expect(HttpStatus.OK);
      const body = response.body as ApplicationResponse[];

      expect(body).toHaveLength(1);
      expect(body[0]?.company).toBe('Closed Co');
    });

    it('фильтрует по result', async () => {
      await seedApplication(ctx.api, buildCreatePayload({ company: 'In Progress Co' }));
      await seedApplication(ctx.api, buildCreatePayload({ company: 'Offer Co', result: 'OFFER' }));

      const response = await ctx.api
        .get(APPLICATIONS_ENDPOINT)
        .query({ result: 'OFFER' })
        .expect(HttpStatus.OK);
      const body = response.body as ApplicationResponse[];

      expect(body).toHaveLength(1);
      expect(body[0]?.company).toBe('Offer Co');
    });

    it('ищет регистронезависимо по company, position и notes', async () => {
      await seedApplication(ctx.api, buildCreatePayload({ company: 'Acme' }));
      await seedApplication(
        ctx.api,
        buildCreatePayload({ company: 'Globex', position: 'Node.js Developer' }),
      );
      await seedApplication(
        ctx.api,
        buildCreatePayload({ company: 'Initech', notes: 'Просили тестовое' }),
      );

      const byCompany = await ctx.api
        .get(APPLICATIONS_ENDPOINT)
        .query({ search: 'ACM' })
        .expect(HttpStatus.OK);
      const byPosition = await ctx.api
        .get(APPLICATIONS_ENDPOINT)
        .query({ search: 'node.JS' })
        .expect(HttpStatus.OK);
      const byNotes = await ctx.api
        .get(APPLICATIONS_ENDPOINT)
        .query({ search: 'ТЕСТОВОЕ' })
        .expect(HttpStatus.OK);

      expect((byCompany.body as ApplicationResponse[]).map((item) => item.company)).toEqual([
        'Acme',
      ]);
      expect((byPosition.body as ApplicationResponse[]).map((item) => item.company)).toEqual([
        'Globex',
      ]);
      expect((byNotes.body as ApplicationResponse[]).map((item) => item.company)).toEqual([
        'Initech',
      ]);
    });

    it('экранирует метасимволы LIKE в search', async () => {
      await seedApplication(ctx.api, buildCreatePayload({ company: 'Acme' }));
      await seedApplication(ctx.api, buildCreatePayload({ company: '100% Remote' }));

      const response = await ctx.api
        .get(APPLICATIONS_ENDPOINT)
        .query({ search: '%' })
        .expect(HttpStatus.OK);
      const body = response.body as ApplicationResponse[];

      expect(body.map((item) => item.company)).toEqual(['100% Remote']);
    });

    it('отклоняет сортировку по полю вне whitelist', async () => {
      await ctx.api
        .get(APPLICATIONS_ENDPOINT)
        .query({ sort: 'notes' })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('отклоняет неизвестный query-параметр', async () => {
      await ctx.api.get(APPLICATIONS_ENDPOINT).query({ bogus: 1 }).expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('GET /api/applications/:id', () => {
    it('отдаёт запись по id', async () => {
      const created = await seedApplication(ctx.api, buildCreatePayload());
      const response = await ctx.api.get(applicationEndpoint(created.id)).expect(HttpStatus.OK);
      const body = response.body as ApplicationResponse;

      expect(body).toEqual(created);
    });

    it('отдаёт 404 для несуществующего id', async () => {
      await ctx.api.get(applicationEndpoint(MISSING_UUID)).expect(HttpStatus.NOT_FOUND);
    });

    it('отдаёт 400 для невалидного UUID', async () => {
      await ctx.api.get(applicationEndpoint(MALFORMED_UUID)).expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('PATCH /api/applications/:id', () => {
    it('меняет только присланное поле и двигает updatedAt', async () => {
      const created = await seedApplication(
        ctx.api,
        buildCreatePayload({ company: 'Acme', position: 'Backend', notes: 'старое' }),
      );

      await delay(UPDATED_AT_DELAY_MS);

      const response = await ctx.api
        .patch(applicationEndpoint(created.id))
        .send({ notes: 'новое' })
        .expect(HttpStatus.OK);
      const body = response.body as ApplicationResponse;

      expect(body.notes).toBe('новое');
      expect(body.company).toBe('Acme');
      expect(body.position).toBe('Backend');
      expect(body.status).toBe('OPEN');
      expect(body.result).toBe('IN_PROGRESS');
      expect(body.createdAt).toBe(created.createdAt);
      expect(new Date(body.updatedAt).getTime()).toBeGreaterThan(
        new Date(created.updatedAt).getTime(),
      );
    });

    it('очищает nullable-поле явным null, не трогая остальные', async () => {
      const created = await seedApplication(
        ctx.api,
        buildCreatePayload({
          hrInterviewAt: '2026-08-10T09:00:00.000Z',
          techInterviewAt: '2026-08-11T09:00:00.000Z',
        }),
      );
      const response = await ctx.api
        .patch(applicationEndpoint(created.id))
        .send({ hrInterviewAt: null })
        .expect(HttpStatus.OK);
      const body = response.body as ApplicationResponse;

      expect(body.hrInterviewAt).toBeNull();
      expect(body.techInterviewAt).toBe('2026-08-11T09:00:00.000Z');
    });

    it('на пустом теле ничего не меняет', async () => {
      const created = await seedApplication(ctx.api, buildCreatePayload({ notes: 'как было' }));
      const response = await ctx.api
        .patch(applicationEndpoint(created.id))
        .send({})
        .expect(HttpStatus.OK);
      const body = response.body as ApplicationResponse;

      expect(body).toEqual(created);
    });

    it('отклоняет null в non-nullable company', async () => {
      const created = await seedApplication(ctx.api, buildCreatePayload());

      await ctx.api
        .patch(applicationEndpoint(created.id))
        .send({ company: null })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('пересчитывает hhVacancyId при смене vacancyUrl', async () => {
      const created = await seedApplication(
        ctx.api,
        buildCreatePayload({ vacancyUrl: 'https://hh.ru/vacancy/11111111' }),
      );

      expect(created.hhVacancyId).toBe('11111111');

      const response = await ctx.api
        .patch(applicationEndpoint(created.id))
        .send({ vacancyUrl: 'https://hh.kz/vacancy/22222222/' })
        .expect(HttpStatus.OK);
      const body = response.body as ApplicationResponse;

      expect(body.hhVacancyId).toBe('22222222');
    });

    it('сбрасывает hhVacancyId, если ссылку заменили на постороннюю или очистили', async () => {
      const created = await seedApplication(
        ctx.api,
        buildCreatePayload({ vacancyUrl: 'https://hh.ru/vacancy/11111111' }),
      );
      const replaced = await ctx.api
        .patch(applicationEndpoint(created.id))
        .send({ vacancyUrl: NON_HH_URL })
        .expect(HttpStatus.OK);

      expect((replaced.body as ApplicationResponse).hhVacancyId).toBeNull();

      const cleared = await ctx.api
        .patch(applicationEndpoint(created.id))
        .send({ vacancyUrl: null })
        .expect(HttpStatus.OK);

      expect((cleared.body as ApplicationResponse).vacancyUrl).toBeNull();
      expect((cleared.body as ApplicationResponse).hhVacancyId).toBeNull();
    });

    it('не трогает hhVacancyId, если vacancyUrl не присылали', async () => {
      const created = await seedApplication(
        ctx.api,
        buildCreatePayload({ vacancyUrl: 'https://hh.ru/vacancy/11111111' }),
      );
      const response = await ctx.api
        .patch(applicationEndpoint(created.id))
        .send({ notes: 'другое поле' })
        .expect(HttpStatus.OK);
      const body = response.body as ApplicationResponse;

      expect(body.hhVacancyId).toBe('11111111');
    });

    it('отдаёт 404 для несуществующего id', async () => {
      await ctx.api
        .patch(applicationEndpoint(MISSING_UUID))
        .send({ notes: 'неважно' })
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe('DELETE /api/applications/:id', () => {
    it('удаляет запись, отдаёт 204 без тела и потом 404', async () => {
      const created = await seedApplication(ctx.api, buildCreatePayload());
      const deleted = await ctx.api
        .delete(applicationEndpoint(created.id))
        .expect(HttpStatus.NO_CONTENT);

      expect(deleted.body).toEqual({});

      await ctx.api.get(applicationEndpoint(created.id)).expect(HttpStatus.NOT_FOUND);
      await ctx.api.delete(applicationEndpoint(created.id)).expect(HttpStatus.NOT_FOUND);
    });

    it('отдаёт 400 для невалидного UUID', async () => {
      await ctx.api.delete(applicationEndpoint(MALFORMED_UUID)).expect(HttpStatus.BAD_REQUEST);
    });
  });
});
