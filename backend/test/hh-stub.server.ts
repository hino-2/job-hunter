import { createServer } from 'node:http';

import type { HhStubReply, HhStubRequest, HhStubServer } from './e2e.interfaces';
import {
  ACCEPT_HEADER_NAME,
  CONTENT_TYPE_HEADER_NAME,
  HH_STUB_BASE_URL,
  HH_STUB_DEFAULT_REPLY,
  HH_STUB_HOST,
  HH_STUB_PORT,
  HTML_CONTENT_TYPE,
  USER_AGENT_HEADER_NAME,
} from './test.constants';

function serializeBody(body: unknown): string {
  if (typeof body === 'string') {
    return body;
  }

  return JSON.stringify(body ?? {});
}

/**
 * Локальная заглушка страницы вакансии hh.ru: e2e гоняют настоящий axios-клиент со
 * всеми таймаутами и ретраями (§4.6), просто на своём порту вместо hh.ru.
 *
 * Слушает адрес, который applyTestEnvironment уже прописал в HH_SITE_BASE_URL
 * (см. HH_STUB_PORT о том, почему порт фиксированный).
 */
export async function startHhStubServer(): Promise<HhStubServer> {
  const requests: HhStubRequest[] = [];
  let reply: HhStubReply = HH_STUB_DEFAULT_REPLY;

  const server = createServer((request, response) => {
    requests.push({
      path: request.url ?? '',
      userAgent: request.headers[USER_AGENT_HEADER_NAME],
      accept: request.headers[ACCEPT_HEADER_NAME],
    });

    response.writeHead(reply.status, { [CONTENT_TYPE_HEADER_NAME]: HTML_CONTENT_TYPE });
    response.end(serializeBody(reply.body));
  });

  await new Promise<void>((resolve) => server.listen(HH_STUB_PORT, HH_STUB_HOST, resolve));

  return {
    baseUrl: HH_STUB_BASE_URL,
    requests,
    respondWith(next: HhStubReply): void {
      reply = next;
    },
    reset(): void {
      requests.length = 0;
      reply = HH_STUB_DEFAULT_REPLY;
    },
    close(): Promise<void> {
      return new Promise((resolve, reject) => {
        server.close((error) => (error === undefined ? resolve() : reject(error)));
      });
    },
  };
}
