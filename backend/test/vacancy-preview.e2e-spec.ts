import { HttpStatus } from '@nestjs/common';

import type { ErrorResponse } from '../src/common/common.interfaces';
import type { VacancyPreviewResponse } from '../src/vacancies/vacancies.interfaces';
import { VACANCY_ACCEPT_HEADER_VALUE } from '../src/vacancies/vacancies.constants';
import { createE2eTestContext } from './e2e-app.factory';
import type { E2eTestContext, VacancyStubServer } from './e2e.interfaces';
import { buildGetmatchVacancyPage } from './getmatch.fixtures';
import { buildHhVacancyPage } from './hh.fixtures';
import {
  GETMATCH_EXPECTED_ATTEMPTS,
  GETMATCH_STUB_PORT,
  HH_EXPECTED_ATTEMPTS,
  HH_STUB_PORT,
  TEST_AUTH_PASSWORD,
  TEST_AUTH_USER,
  TEST_GETMATCH_USER_AGENT,
  TEST_GETMATCH_VACANCY_PATH,
  TEST_GETMATCH_VACANCY_URL,
  TEST_HH_USER_AGENT,
  TEST_VACANCY_PATH,
  TEST_VACANCY_URL,
  UNSUPPORTED_VACANCY_URL,
  VACANCY_PREVIEW_ENDPOINT,
} from './test.constants';
import { startVacancyStubServer } from './vacancy-stub.server';

describe('Vacancy preview (e2e)', () => {
  let ctx: E2eTestContext;
  let stub: VacancyStubServer;
  let getmatchStub: VacancyStubServer;

  beforeAll(async () => {
    // HH_SITE_BASE_URL/GETMATCH_SITE_BASE_URL уже указывают на эти адреса: их
    // прописывает applyTestEnvironment до импорта app.module (ConfigModule читает
    // env именно там).
    stub = await startVacancyStubServer(HH_STUB_PORT);
    getmatchStub = await startVacancyStubServer(GETMATCH_STUB_PORT);
    ctx = await createE2eTestContext();
  });

  afterAll(async () => {
    await ctx.close();
    await stub.close();
    await getmatchStub.close();
  });

  beforeEach(() => {
    stub.reset();
    getmatchStub.reset();
  });

  describe('hh.ru — успешные сценарии', () => {
    it('отдаёт данные вакансии и ходит на /vacancy/{id} без query и с нужными заголовками', async () => {
      stub.respondWith({ status: HttpStatus.OK, body: buildHhVacancyPage() });

      const response = await ctx.api
        .post(VACANCY_PREVIEW_ENDPOINT)
        .send({ url: TEST_VACANCY_URL })
        .expect(HttpStatus.OK);
      const body = response.body as VacancyPreviewResponse;

      expect(body).toEqual({
        source: 'HH',
        vacancyExternalId: '12345678',
        company: 'Acme',
        position: 'Node.js Developer',
        archived: false,
      });

      expect(stub.requests).toHaveLength(1);
      expect(stub.requests[0]?.path).toBe(TEST_VACANCY_PATH);
      expect(stub.requests[0]?.path).not.toContain('?');
      expect(stub.requests[0]?.userAgent).toBe(TEST_HH_USER_AGENT);
      expect(stub.requests[0]?.accept).toBe(VACANCY_ACCEPT_HEADER_VALUE);
    });

    it('отдаёт признаки снятой вакансии', async () => {
      stub.respondWith({
        status: HttpStatus.OK,
        body: buildHhVacancyPage({ archived: true }),
      });

      const response = await ctx.api
        .post(VACANCY_PREVIEW_ENDPOINT)
        .send({ url: TEST_VACANCY_URL })
        .expect(HttpStatus.OK);
      const body = response.body as VacancyPreviewResponse;

      expect(body.archived).toBe(true);
      expect(body.source).toBe('HH');
    });

    it('не считает ошибкой вакансию без работодателя и без названия', async () => {
      stub.respondWith({
        status: HttpStatus.OK,
        body: buildHhVacancyPage({ title: null, employerName: null }),
      });

      const response = await ctx.api
        .post(VACANCY_PREVIEW_ENDPOINT)
        .send({ url: TEST_VACANCY_URL })
        .expect(HttpStatus.OK);
      const body = response.body as VacancyPreviewResponse;

      expect(body.company).toBeNull();
      expect(body.position).toBeNull();
      expect(body.vacancyExternalId).toBe('12345678');
    });

    it('страница без JSON-LD, но с признаком архивности — 200 с company/position null', async () => {
      stub.respondWith({
        status: HttpStatus.OK,
        body: buildHhVacancyPage({ withJsonLd: false, archived: true }),
      });

      const response = await ctx.api
        .post(VACANCY_PREVIEW_ENDPOINT)
        .send({ url: TEST_VACANCY_URL })
        .expect(HttpStatus.OK);
      const body = response.body as VacancyPreviewResponse;

      expect(body).toEqual({
        source: 'HH',
        vacancyExternalId: '12345678',
        company: null,
        position: null,
        archived: true,
      });
    });

    it.each([
      ['чужой хост', UNSUPPORTED_VACANCY_URL],
      ['не URL вовсе', 'просто текст'],
      ['пустая строка', ''],
    ])(
      'на нераспознанной ссылке (%s) отдаёт 200 с нулями и не ходит в источник',
      async (_c, url) => {
        const response = await ctx.api
          .post(VACANCY_PREVIEW_ENDPOINT)
          .send({ url })
          .expect(HttpStatus.OK);
        const body = response.body as VacancyPreviewResponse;

        expect(body).toEqual({
          source: null,
          vacancyExternalId: null,
          company: null,
          position: null,
          archived: null,
        });
        expect(stub.requests).toHaveLength(0);
      },
    );
  });

  describe('hh.ru — ошибки', () => {
    it('404 отдаёт 404 в формате §5.5 и не повторяет запрос', async () => {
      stub.respondWith({ status: HttpStatus.NOT_FOUND, body: '' });

      const response = await ctx.api
        .post(VACANCY_PREVIEW_ENDPOINT)
        .send({ url: TEST_VACANCY_URL })
        .expect(HttpStatus.NOT_FOUND);
      const body = response.body as ErrorResponse;

      expect(body.statusCode).toBe(HttpStatus.NOT_FOUND);
      expect(body.error).toBe('Not Found');
      expect(typeof body.message).toBe('string');
      expect(stub.requests).toHaveLength(1);
    });

    it('403 отдаёт 502 без ретраев', async () => {
      stub.respondWith({ status: HttpStatus.FORBIDDEN, body: '' });

      const response = await ctx.api
        .post(VACANCY_PREVIEW_ENDPOINT)
        .send({ url: TEST_VACANCY_URL })
        .expect(HttpStatus.BAD_GATEWAY);
      const body = response.body as ErrorResponse;

      expect(body.statusCode).toBe(HttpStatus.BAD_GATEWAY);
      expect(stub.requests).toHaveLength(1);
    });

    it('5xx отдаёт 502 после всех ретраев (§4.6)', async () => {
      stub.respondWith({ status: HttpStatus.SERVICE_UNAVAILABLE });

      const response = await ctx.api
        .post(VACANCY_PREVIEW_ENDPOINT)
        .send({ url: TEST_VACANCY_URL })
        .expect(HttpStatus.BAD_GATEWAY);
      const body = response.body as ErrorResponse;

      expect(body.statusCode).toBe(HttpStatus.BAD_GATEWAY);
      expect(stub.requests).toHaveLength(HH_EXPECTED_ATTEMPTS);
    });

    it('страница без признака архивности отдаёт 502 без ретраев', async () => {
      stub.respondWith({
        status: HttpStatus.OK,
        body: '<html><body>Проверка браузера</body></html>',
      });

      await ctx.api
        .post(VACANCY_PREVIEW_ENDPOINT)
        .send({ url: TEST_VACANCY_URL })
        .expect(HttpStatus.BAD_GATEWAY);

      expect(stub.requests).toHaveLength(1);
    });

    it('ответ без обязательных полей отдаёт 502', async () => {
      stub.respondWith({
        status: HttpStatus.OK,
        body: buildHhVacancyPage({ archivedTokens: 'none' }),
      });

      await ctx.api
        .post(VACANCY_PREVIEW_ENDPOINT)
        .send({ url: TEST_VACANCY_URL })
        .expect(HttpStatus.BAD_GATEWAY);
    });
  });

  describe('getmatch.ru — успешные сценарии', () => {
    it('отдаёт данные вакансии и ходит на /vacancies/{id} без query и с нужными заголовками', async () => {
      getmatchStub.respondWith({ status: HttpStatus.OK, body: buildGetmatchVacancyPage() });

      const response = await ctx.api
        .post(VACANCY_PREVIEW_ENDPOINT)
        .send({ url: TEST_GETMATCH_VACANCY_URL })
        .expect(HttpStatus.OK);
      const body = response.body as VacancyPreviewResponse;

      expect(body).toEqual({
        source: 'GETMATCH',
        vacancyExternalId: '35683',
        company: 'Acme',
        position: 'Node.js Developer',
        archived: false,
      });

      expect(getmatchStub.requests).toHaveLength(1);
      expect(getmatchStub.requests[0]?.path).toBe(TEST_GETMATCH_VACANCY_PATH);
      expect(getmatchStub.requests[0]?.path).not.toContain('?');
      expect(getmatchStub.requests[0]?.userAgent).toBe(TEST_GETMATCH_USER_AGENT);
      expect(getmatchStub.requests[0]?.accept).toBe(VACANCY_ACCEPT_HEADER_VALUE);
    });

    it('is_active: false отдаёт archived: true (§4.9)', async () => {
      getmatchStub.respondWith({
        status: HttpStatus.OK,
        body: buildGetmatchVacancyPage({ isActive: false }),
      });

      const response = await ctx.api
        .post(VACANCY_PREVIEW_ENDPOINT)
        .send({ url: TEST_GETMATCH_VACANCY_URL })
        .expect(HttpStatus.OK);
      const body = response.body as VacancyPreviewResponse;

      expect(body.archived).toBe(true);
      expect(body.source).toBe('GETMATCH');
    });
  });

  describe('getmatch.ru — ошибки', () => {
    it('initialVacancy: null отдаёт 404, а не 502 (§4.9 — «нет вакансии» это HTTP 200)', async () => {
      getmatchStub.respondWith({
        status: HttpStatus.OK,
        body: buildGetmatchVacancyPage({ initialVacancy: 'null' }),
      });

      const response = await ctx.api
        .post(VACANCY_PREVIEW_ENDPOINT)
        .send({ url: TEST_GETMATCH_VACANCY_URL })
        .expect(HttpStatus.NOT_FOUND);
      const body = response.body as ErrorResponse;

      expect(body.statusCode).toBe(HttpStatus.NOT_FOUND);
      expect(getmatchStub.requests).toHaveLength(1);
    });

    it('payload без ключа initialVacancy отдаёт 502 без ретраев', async () => {
      getmatchStub.respondWith({
        status: HttpStatus.OK,
        body: buildGetmatchVacancyPage({ initialVacancy: 'missing' }),
      });

      const response = await ctx.api
        .post(VACANCY_PREVIEW_ENDPOINT)
        .send({ url: TEST_GETMATCH_VACANCY_URL })
        .expect(HttpStatus.BAD_GATEWAY);
      const body = response.body as ErrorResponse;

      expect(body.statusCode).toBe(HttpStatus.BAD_GATEWAY);
      expect(getmatchStub.requests).toHaveLength(1);
    });

    it('429 отдаёт 502 после всех ретраев (§4.6)', async () => {
      getmatchStub.respondWith({ status: HttpStatus.TOO_MANY_REQUESTS });

      const response = await ctx.api
        .post(VACANCY_PREVIEW_ENDPOINT)
        .send({ url: TEST_GETMATCH_VACANCY_URL })
        .expect(HttpStatus.BAD_GATEWAY);
      const body = response.body as ErrorResponse;

      expect(body.statusCode).toBe(HttpStatus.BAD_GATEWAY);
      expect(getmatchStub.requests).toHaveLength(GETMATCH_EXPECTED_ATTEMPTS);
    });
  });

  describe('валидация и доступ', () => {
    it('требует Basic Auth', async () => {
      await ctx.anonymousApi
        .post(VACANCY_PREVIEW_ENDPOINT)
        .send({ url: TEST_VACANCY_URL })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('пускает с правильными кредами', async () => {
      stub.respondWith({ status: HttpStatus.OK, body: buildHhVacancyPage() });

      await ctx.anonymousApi
        .post(VACANCY_PREVIEW_ENDPOINT)
        .auth(TEST_AUTH_USER, TEST_AUTH_PASSWORD)
        .send({ url: TEST_VACANCY_URL })
        .expect(HttpStatus.OK);
    });

    it('отклоняет тело без url', async () => {
      const response = await ctx.api
        .post(VACANCY_PREVIEW_ENDPOINT)
        .send({})
        .expect(HttpStatus.BAD_REQUEST);
      const body = response.body as ErrorResponse;

      expect(body.message).toContain('url must be a string');
    });

    it('отклоняет неизвестное поле', async () => {
      const response = await ctx.api
        .post(VACANCY_PREVIEW_ENDPOINT)
        .send({ url: TEST_VACANCY_URL, bogus: 1 })
        .expect(HttpStatus.BAD_REQUEST);
      const body = response.body as ErrorResponse;

      expect(body.message).toContain('property bogus should not exist');
    });
  });
});
