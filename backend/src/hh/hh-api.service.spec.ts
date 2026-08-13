import { HttpService } from '@nestjs/axios';
import { HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AxiosResponse } from 'axios';
import { of, throwError } from 'rxjs';

import { SYNC_OUTCOME } from '../applications/applications.constants';
import { HhApiService } from './hh-api.service';
import {
  HH_MAX_RETRIES_ENV_KEY,
  HH_SITE_BASE_URL_ENV_KEY,
  HH_VACANCY_PAGE_PATH,
} from './hh.constants';

/** Мок HttpService: спеке нужен только get, а инстанс настоящего клиента — нет. */
interface HttpServiceMock {
  get: jest.Mock;
}

/**
 * Тест-локальный билдер HTML-страницы вакансии (jest.config.js: rootDir: 'src' —
 * spec не может импортировать фикстуры из backend/test/, поэтому минимальная копия
 * генератора живёт здесь же; правило §10 п.4 явно разрешает инлайновый тестовый
 * тип в spec-файле, билдер — его прямое продолжение).
 */
interface PageOptions {
  title?: string | null;
  employerName?: string | null;
  archived?: boolean;
  withJsonLd?: boolean;
  brokenJsonLd?: boolean;
  archivedTokens?: 'both' | 'none' | 'conflicting';
}

const VACANCY_ID = '12345678';

function jsonLdBlock(title: string | null, employerName: string | null): string {
  const jobPosting: Record<string, unknown> = {
    '@context': 'https://schema.org/',
    '@type': 'JobPosting',
  };

  if (title !== null) {
    jobPosting.title = title;
  }

  if (employerName !== null) {
    jobPosting.hiringOrganization = { '@type': 'Organization', name: employerName };
  }

  return `<script type="application/ld+json">${JSON.stringify(jobPosting)}</script>`;
}

function archivedMarkup(mode: 'both' | 'none' | 'conflicting', archived: boolean): string {
  if (mode === 'none') {
    return '';
  }

  if (mode === 'conflicting') {
    return (
      `<div data-params='{"vacancyId":"${VACANCY_ID}","archived": "true"}'></div>` +
      `<div data-state="{&#34;status&#34;:{&#34;archived&#34;:false}}"></div>`
    );
  }

  const flag = archived ? 'true' : 'false';
  const marker = archived
    ? '<span data-qa="vacancy-title-archived-text">Вакансия в архиве</span>'
    : '';

  return (
    `${marker}` +
    `<div data-params='{"vacancyId":"${VACANCY_ID}","archived": "${flag}"}'></div>` +
    `<div data-state="{&#34;status&#34;:{&#34;archived&#34;:${flag}}}"></div>`
  );
}

function buildPage(options: PageOptions = {}): string {
  const {
    title = 'Node.js Developer',
    employerName = 'Acme',
    archived = false,
    withJsonLd = true,
    brokenJsonLd = false,
    archivedTokens = 'both',
  } = options;

  const jsonLd = brokenJsonLd
    ? '<script type="application/ld+json">{это не json,,,}</script>'
    : withJsonLd
      ? jsonLdBlock(title, employerName)
      : '';

  return (
    `<!DOCTYPE html><html><head>${jsonLd}</head>` +
    `<body>${archivedMarkup(archivedTokens, archived)}</body></html>`
  );
}

/** Полный AxiosResponse не нужен: сервис читает только status и data. */
function axiosResponse(status: number, data: unknown): AxiosResponse<unknown> {
  return { status, data } as AxiosResponse<unknown>;
}

function createService(maxRetries: number): { service: HhApiService; http: HttpServiceMock } {
  const http: HttpServiceMock = { get: jest.fn() };
  const configService = {
    getOrThrow: jest.fn((key: string) => {
      if (key === HH_MAX_RETRIES_ENV_KEY) {
        return maxRetries;
      }

      if (key === HH_SITE_BASE_URL_ENV_KEY) {
        return 'https://hh.ru';
      }

      throw new Error(`Неожиданный ключ конфигурации: ${key}`);
    }),
  } as unknown as ConfigService;

  return {
    service: new HhApiService(http as unknown as HttpService, configService),
    http,
  };
}

/**
 * Прогоняет ретраи на фейковых таймерах: реальный backoff §4.6 — это 500 + 1500 мс,
 * и платить две секунды за каждый такой тест не нужно.
 */
async function runWithRetries(promise: Promise<unknown>): Promise<unknown> {
  await jest.advanceTimersByTimeAsync(60_000);

  return promise;
}

describe('HhApiService', () => {
  beforeAll(() => {
    // Сервис логирует каждый сбой предупреждением — в спеке это ожидаемо и только
    // засоряет вывод Jest, поэтому логгер глушится целиком.
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('успешный ответ', () => {
    it('запрашивает /vacancy/{id} и возвращает разобранную вакансию', async () => {
      const { service, http } = createService(2);

      http.get.mockReturnValue(of(axiosResponse(HttpStatus.OK, buildPage())));

      const result = await service.fetchVacancy(VACANCY_ID);

      expect(http.get).toHaveBeenCalledTimes(1);
      expect(http.get).toHaveBeenCalledWith(`${HH_VACANCY_PAGE_PATH}/${VACANCY_ID}`);
      expect(result).toEqual({
        outcome: SYNC_OUTCOME.OK,
        vacancy: {
          name: 'Node.js Developer',
          archived: false,
          employerName: 'Acme',
          logoUrl: null,
          logoAllowedHostPattern: null,
        },
      });
    });

    it('не считает отсутствие employer ошибкой', async () => {
      const { service, http } = createService(2);

      http.get.mockReturnValue(
        of(axiosResponse(HttpStatus.OK, buildPage({ employerName: null, archived: true }))),
      );

      const result = await service.fetchVacancy(VACANCY_ID);

      expect(result).toEqual({
        outcome: SYNC_OUTCOME.OK,
        vacancy: {
          name: 'Node.js Developer',
          archived: true,
          employerName: null,
          logoUrl: null,
          logoAllowedHostPattern: null,
        },
      });
    });

    it('страница без JSON-LD, но с признаком архивности — OK с пустыми name/employerName', async () => {
      const { service, http } = createService(2);

      http.get.mockReturnValue(
        of(axiosResponse(HttpStatus.OK, buildPage({ withJsonLd: false, archived: true }))),
      );

      const result = await service.fetchVacancy(VACANCY_ID);

      expect(result).toEqual({
        outcome: SYNC_OUTCOME.OK,
        vacancy: {
          name: null,
          archived: true,
          employerName: null,
          logoUrl: null,
          logoAllowedHostPattern: null,
        },
      });
    });
  });

  describe('невалидное тело ответа', () => {
    it.each([
      ['null', null],
      ['объект вместо строки', { archived: false }],
      ['пустая строка', ''],
      ['страница без токенов и маркера', buildPage({ archivedTokens: 'none' })],
      ['страница с противоречивыми токенами', buildPage({ archivedTokens: 'conflicting' })],
      [
        'битый JSON-LD при отсутствующих токенах',
        buildPage({ archivedTokens: 'none', brokenJsonLd: true }),
      ],
    ])('отдаёт ERROR, если %s', async (_case, payload) => {
      const { service, http } = createService(2);

      http.get.mockReturnValue(of(axiosResponse(HttpStatus.OK, payload)));

      const result = await service.fetchVacancy(VACANCY_ID);

      expect(result.outcome).toBe(SYNC_OUTCOME.ERROR);
      // Нераспознанная страница повтором не лечится — запрос должен быть ровно один.
      expect(http.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('ошибочные статусы', () => {
    it('404 отдаёт NOT_FOUND без ретраев', async () => {
      const { service, http } = createService(2);

      http.get.mockReturnValue(of(axiosResponse(HttpStatus.NOT_FOUND, '')));

      const result = await service.fetchVacancy(VACANCY_ID);

      expect(result.outcome).toBe(SYNC_OUTCOME.NOT_FOUND);
      expect(http.get).toHaveBeenCalledTimes(1);
    });

    it('403 отдаёт ERROR без ретраев', async () => {
      const { service, http } = createService(2);

      http.get.mockReturnValue(of(axiosResponse(HttpStatus.FORBIDDEN, '')));

      const result = await service.fetchVacancy(VACANCY_ID);

      expect(result).toEqual({
        outcome: SYNC_OUTCOME.ERROR,
        message: expect.stringContaining('403') as string,
      });
      expect(http.get).toHaveBeenCalledTimes(1);
    });

    it('429 повторяет запрос до лимита и отдаёт RATE_LIMITED', async () => {
      const { service, http } = createService(2);

      jest.useFakeTimers();
      http.get.mockReturnValue(of(axiosResponse(HttpStatus.TOO_MANY_REQUESTS, '')));

      const result = await runWithRetries(service.fetchVacancy(VACANCY_ID));

      expect(result).toEqual({
        outcome: SYNC_OUTCOME.RATE_LIMITED,
        message: expect.any(String) as string,
      });
      expect(http.get).toHaveBeenCalledTimes(3);
    });

    it('5xx повторяет запрос до лимита и отдаёт ERROR', async () => {
      const { service, http } = createService(2);

      jest.useFakeTimers();
      http.get.mockReturnValue(of(axiosResponse(HttpStatus.SERVICE_UNAVAILABLE, '')));

      const result = (await runWithRetries(service.fetchVacancy(VACANCY_ID))) as {
        outcome: string;
      };

      expect(result.outcome).toBe(SYNC_OUTCOME.ERROR);
      expect(http.get).toHaveBeenCalledTimes(3);
    });

    it('возвращает успех, если повтор после 5xx удался', async () => {
      const { service, http } = createService(2);

      jest.useFakeTimers();
      http.get
        .mockReturnValueOnce(of(axiosResponse(HttpStatus.BAD_GATEWAY, '')))
        .mockReturnValueOnce(of(axiosResponse(HttpStatus.OK, buildPage())));

      const result = (await runWithRetries(service.fetchVacancy(VACANCY_ID))) as {
        outcome: string;
      };

      expect(result.outcome).toBe(SYNC_OUTCOME.OK);
      expect(http.get).toHaveBeenCalledTimes(2);
    });

    it('не повторяет запрос при HH_MAX_RETRIES=0', async () => {
      const { service, http } = createService(0);

      http.get.mockReturnValue(of(axiosResponse(HttpStatus.SERVICE_UNAVAILABLE, '')));

      const result = await service.fetchVacancy(VACANCY_ID);

      expect(result.outcome).toBe(SYNC_OUTCOME.ERROR);
      expect(http.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('транспортные ошибки', () => {
    it('таймаут отдаёт ERROR без ретраев и не выбрасывает исключение', async () => {
      const { service, http } = createService(2);

      http.get.mockReturnValue(throwError(() => new Error('timeout of 10000ms exceeded')));

      const result = await service.fetchVacancy(VACANCY_ID);

      expect(result).toEqual({
        outcome: SYNC_OUTCOME.ERROR,
        message: expect.stringContaining('timeout of 10000ms exceeded') as string,
      });
      expect(http.get).toHaveBeenCalledTimes(1);
    });
  });
});
