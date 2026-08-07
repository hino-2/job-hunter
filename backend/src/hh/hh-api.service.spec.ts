import { HttpService } from '@nestjs/axios';
import { HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AxiosResponse } from 'axios';
import { of, throwError } from 'rxjs';

import { SYNC_OUTCOME } from '../applications/applications.constants';
import { HhApiService } from './hh-api.service';
import { HH_MAX_RETRIES_ENV_KEY, HH_VACANCIES_PATH } from './hh.constants';

/** Мок HttpService: спеке нужен только get, а инстанс настоящего клиента — нет. */
interface HttpServiceMock {
  get: jest.Mock;
}

const VACANCY_ID = '12345678';

const VACANCY_PAYLOAD = {
  id: VACANCY_ID,
  name: 'Node.js Developer',
  archived: false,
  type: { id: 'open', name: 'Открытая' },
  employer: { id: '1', name: 'Acme' },
  description: 'игнорируется',
};

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
    it('запрашивает /vacancies/{id} и возвращает разобранную вакансию', async () => {
      const { service, http } = createService(2);

      http.get.mockReturnValue(of(axiosResponse(HttpStatus.OK, VACANCY_PAYLOAD)));

      const result = await service.fetchVacancy(VACANCY_ID);

      expect(http.get).toHaveBeenCalledTimes(1);
      expect(http.get).toHaveBeenCalledWith(`${HH_VACANCIES_PATH}/${VACANCY_ID}`);
      expect(result).toEqual({
        outcome: SYNC_OUTCOME.OK,
        vacancy: {
          name: 'Node.js Developer',
          archived: false,
          typeId: 'open',
          employerName: 'Acme',
        },
      });
    });

    it('не считает отсутствие employer ошибкой', async () => {
      const { service, http } = createService(2);

      http.get.mockReturnValue(
        of(axiosResponse(HttpStatus.OK, { archived: true, type: { id: 'anonymous' } })),
      );

      const result = await service.fetchVacancy(VACANCY_ID);

      expect(result).toEqual({
        outcome: SYNC_OUTCOME.OK,
        vacancy: { name: null, archived: true, typeId: 'anonymous', employerName: null },
      });
    });
  });

  describe('невалидное тело ответа', () => {
    it.each([
      ['не объект', 'строка вместо JSON'],
      ['null', null],
      ['нет archived', { type: { id: 'open' } }],
      ['archived не boolean', { archived: 'false', type: { id: 'open' } }],
      ['нет type', { archived: false }],
      ['type.id не строка', { archived: false, type: { id: 7 } }],
    ])('отдаёт ERROR, если %s', async (_case, payload) => {
      const { service, http } = createService(2);

      http.get.mockReturnValue(of(axiosResponse(HttpStatus.OK, payload)));

      const result = await service.fetchVacancy(VACANCY_ID);

      expect(result.outcome).toBe(SYNC_OUTCOME.ERROR);
      // Битый JSON повтором не лечится — запрос должен быть ровно один.
      expect(http.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('ошибочные статусы', () => {
    it('404 отдаёт NOT_FOUND без ретраев', async () => {
      const { service, http } = createService(2);

      http.get.mockReturnValue(of(axiosResponse(HttpStatus.NOT_FOUND, {})));

      const result = await service.fetchVacancy(VACANCY_ID);

      expect(result.outcome).toBe(SYNC_OUTCOME.NOT_FOUND);
      expect(http.get).toHaveBeenCalledTimes(1);
    });

    it('403 отдаёт ERROR без ретраев', async () => {
      const { service, http } = createService(2);

      http.get.mockReturnValue(of(axiosResponse(HttpStatus.FORBIDDEN, {})));

      const result = await service.fetchVacancy(VACANCY_ID);

      expect(result.outcome).toBe(SYNC_OUTCOME.ERROR);
      expect(http.get).toHaveBeenCalledTimes(1);
    });

    it('429 повторяет запрос до лимита и отдаёт RATE_LIMITED', async () => {
      const { service, http } = createService(2);

      jest.useFakeTimers();
      http.get.mockReturnValue(of(axiosResponse(HttpStatus.TOO_MANY_REQUESTS, {})));

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
      http.get.mockReturnValue(of(axiosResponse(HttpStatus.SERVICE_UNAVAILABLE, {})));

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
        .mockReturnValueOnce(of(axiosResponse(HttpStatus.BAD_GATEWAY, {})))
        .mockReturnValueOnce(of(axiosResponse(HttpStatus.OK, VACANCY_PAYLOAD)));

      const result = (await runWithRetries(service.fetchVacancy(VACANCY_ID))) as {
        outcome: string;
      };

      expect(result.outcome).toBe(SYNC_OUTCOME.OK);
      expect(http.get).toHaveBeenCalledTimes(2);
    });

    it('не повторяет запрос при HH_MAX_RETRIES=0', async () => {
      const { service, http } = createService(0);

      http.get.mockReturnValue(of(axiosResponse(HttpStatus.SERVICE_UNAVAILABLE, {})));

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
