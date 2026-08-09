import { createServer } from 'node:http';

import type { VacancyStubReply, VacancyStubRequest, VacancyStubServer } from './e2e.interfaces';
import {
  ACCEPT_HEADER_NAME,
  CONTENT_TYPE_HEADER_NAME,
  HTML_CONTENT_TYPE,
  USER_AGENT_HEADER_NAME,
  VACANCY_STUB_DEFAULT_REPLY,
  VACANCY_STUB_HOST,
} from './test.constants';

function serializeBody(body: unknown): string {
  if (typeof body === 'string') {
    return body;
  }

  return JSON.stringify(body ?? {});
}

/**
 * Локальная заглушка страницы вакансии источника (hh.ru или getmatch.ru): e2e гоняют
 * настоящий axios-клиент со всеми таймаутами и ретраями (§4.6), просто на своём порту
 * вместо реального сайта.
 *
 * Обобщена из hh-stub.server.ts (шаг B2): различий между источниками в самой заглушке
 * нет, только порт — запускается дважды, на HH_STUB_PORT и (с фазы B3) GETMATCH_STUB_PORT.
 * Порт фиксированный, а не «любой свободный»: *_SITE_BASE_URL обязан быть известен ДО
 * импорта app.module — ConfigModule.forRoot() читает env в момент вычисления декоратора
 * @Module, то есть на импорте файла, а не на compile() тестового модуля.
 */
export async function startVacancyStubServer(port: number): Promise<VacancyStubServer> {
  const requests: VacancyStubRequest[] = [];
  let reply: VacancyStubReply = VACANCY_STUB_DEFAULT_REPLY;

  const server = createServer((request, response) => {
    requests.push({
      path: request.url ?? '',
      userAgent: request.headers[USER_AGENT_HEADER_NAME],
      accept: request.headers[ACCEPT_HEADER_NAME],
    });

    response.writeHead(reply.status, { [CONTENT_TYPE_HEADER_NAME]: HTML_CONTENT_TYPE });
    response.end(serializeBody(reply.body));
  });

  await new Promise<void>((resolve) => server.listen(port, VACANCY_STUB_HOST, resolve));

  return {
    baseUrl: `http://${VACANCY_STUB_HOST}:${port}`,
    requests,
    respondWith(next: VacancyStubReply): void {
      reply = next;
    },
    reset(): void {
      requests.length = 0;
      reply = VACANCY_STUB_DEFAULT_REPLY;
    },
    close(): Promise<void> {
      return new Promise((resolve, reject) => {
        server.close((error) => (error === undefined ? resolve() : reject(error)));
      });
    },
  };
}
