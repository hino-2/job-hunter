import { HttpStatus } from '@nestjs/common';

import type { ErrorResponse } from '../src/common/common.interfaces';
import { HH_ACCEPT_HEADER_VALUE } from '../src/hh/hh.constants';
import type { HhPreviewResponse } from '../src/hh/hh.interfaces';
import { createE2eTestContext } from './e2e-app.factory';
import type { E2eTestContext, HhStubServer } from './e2e.interfaces';
import { buildHhVacancyPage } from './hh.fixtures';
import { startHhStubServer } from './hh-stub.server';
import {
  HH_EXPECTED_ATTEMPTS,
  HH_PREVIEW_ENDPOINT,
  NON_HH_URL,
  TEST_AUTH_PASSWORD,
  TEST_AUTH_USER,
  TEST_HH_USER_AGENT,
  TEST_VACANCY_PATH,
  TEST_VACANCY_URL,
} from './test.constants';

describe('HH preview (e2e)', () => {
  let ctx: E2eTestContext;
  let stub: HhStubServer;

  beforeAll(async () => {
    // HH_SITE_BASE_URL уже указывает на этот адрес: его прописывает applyTestEnvironment
    // до импорта app.module (ConfigModule читает env именно там).
    stub = await startHhStubServer();
    ctx = await createE2eTestContext();
  });

  afterAll(async () => {
    await ctx.close();
    await stub.close();
  });

  beforeEach(() => {
    stub.reset();
  });

  describe('успешные сценарии', () => {
    it('отдаёт данные вакансии и ходит на /vacancy/{id} без query и с нужными заголовками', async () => {
      stub.respondWith({ status: HttpStatus.OK, body: buildHhVacancyPage() });

      const response = await ctx.api
        .post(HH_PREVIEW_ENDPOINT)
        .send({ url: TEST_VACANCY_URL })
        .expect(HttpStatus.OK);
      const body = response.body as HhPreviewResponse;

      expect(body).toEqual({
        hhVacancyId: '12345678',
        company: 'Acme',
        position: 'Node.js Developer',
        archived: false,
        vacancyType: null,
      });

      expect(stub.requests).toHaveLength(1);
      expect(stub.requests[0]?.path).toBe(TEST_VACANCY_PATH);
      expect(stub.requests[0]?.path).not.toContain('?');
      expect(stub.requests[0]?.userAgent).toBe(TEST_HH_USER_AGENT);
      expect(stub.requests[0]?.accept).toBe(HH_ACCEPT_HEADER_VALUE);
    });

    it('отдаёт признаки снятой вакансии', async () => {
      stub.respondWith({
        status: HttpStatus.OK,
        body: buildHhVacancyPage({ archived: true }),
      });

      const response = await ctx.api
        .post(HH_PREVIEW_ENDPOINT)
        .send({ url: TEST_VACANCY_URL })
        .expect(HttpStatus.OK);
      const body = response.body as HhPreviewResponse;

      expect(body.archived).toBe(true);
      expect(body.vacancyType).toBeNull();
    });

    it('не считает ошибкой вакансию без работодателя и без названия', async () => {
      stub.respondWith({
        status: HttpStatus.OK,
        body: buildHhVacancyPage({ title: null, employerName: null }),
      });

      const response = await ctx.api
        .post(HH_PREVIEW_ENDPOINT)
        .send({ url: TEST_VACANCY_URL })
        .expect(HttpStatus.OK);
      const body = response.body as HhPreviewResponse;

      expect(body.company).toBeNull();
      expect(body.position).toBeNull();
      expect(body.hhVacancyId).toBe('12345678');
    });

    it('страница без JSON-LD, но с признаком архивности — 200 с company/position null', async () => {
      stub.respondWith({
        status: HttpStatus.OK,
        body: buildHhVacancyPage({ withJsonLd: false, archived: true }),
      });

      const response = await ctx.api
        .post(HH_PREVIEW_ENDPOINT)
        .send({ url: TEST_VACANCY_URL })
        .expect(HttpStatus.OK);
      const body = response.body as HhPreviewResponse;

      expect(body).toEqual({
        hhVacancyId: '12345678',
        company: null,
        position: null,
        archived: true,
        vacancyType: null,
      });
    });

    it.each([
      ['чужой хост', NON_HH_URL],
      ['не URL вовсе', 'просто текст'],
      ['пустая строка', ''],
    ])('на нераспознанной ссылке (%s) отдаёт 200 с нулями и не ходит в hh.ru', async (_c, url) => {
      const response = await ctx.api.post(HH_PREVIEW_ENDPOINT).send({ url }).expect(HttpStatus.OK);
      const body = response.body as HhPreviewResponse;

      expect(body).toEqual({
        hhVacancyId: null,
        company: null,
        position: null,
        archived: null,
        vacancyType: null,
      });
      expect(stub.requests).toHaveLength(0);
    });
  });

  describe('ошибки hh.ru', () => {
    it('404 отдаёт 404 в формате §5.5 и не повторяет запрос', async () => {
      stub.respondWith({ status: HttpStatus.NOT_FOUND, body: '' });

      const response = await ctx.api
        .post(HH_PREVIEW_ENDPOINT)
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
        .post(HH_PREVIEW_ENDPOINT)
        .send({ url: TEST_VACANCY_URL })
        .expect(HttpStatus.BAD_GATEWAY);
      const body = response.body as ErrorResponse;

      expect(body.statusCode).toBe(HttpStatus.BAD_GATEWAY);
      expect(stub.requests).toHaveLength(1);
    });

    it('5xx отдаёт 502 после всех ретраев (§4.6)', async () => {
      stub.respondWith({ status: HttpStatus.SERVICE_UNAVAILABLE });

      const response = await ctx.api
        .post(HH_PREVIEW_ENDPOINT)
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
        .post(HH_PREVIEW_ENDPOINT)
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
        .post(HH_PREVIEW_ENDPOINT)
        .send({ url: TEST_VACANCY_URL })
        .expect(HttpStatus.BAD_GATEWAY);
    });
  });

  describe('валидация и доступ', () => {
    it('требует Basic Auth', async () => {
      await ctx.anonymousApi
        .post(HH_PREVIEW_ENDPOINT)
        .send({ url: TEST_VACANCY_URL })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('пускает с правильными кредами', async () => {
      stub.respondWith({ status: HttpStatus.OK, body: buildHhVacancyPage() });

      await ctx.anonymousApi
        .post(HH_PREVIEW_ENDPOINT)
        .auth(TEST_AUTH_USER, TEST_AUTH_PASSWORD)
        .send({ url: TEST_VACANCY_URL })
        .expect(HttpStatus.OK);
    });

    it('отклоняет тело без url', async () => {
      const response = await ctx.api
        .post(HH_PREVIEW_ENDPOINT)
        .send({})
        .expect(HttpStatus.BAD_REQUEST);
      const body = response.body as ErrorResponse;

      expect(body.message).toContain('url must be a string');
    });

    it('отклоняет неизвестное поле', async () => {
      const response = await ctx.api
        .post(HH_PREVIEW_ENDPOINT)
        .send({ url: TEST_VACANCY_URL, bogus: 1 })
        .expect(HttpStatus.BAD_REQUEST);
      const body = response.body as ErrorResponse;

      expect(body.message).toContain('property bogus should not exist');
    });
  });
});
