import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

import { OK_STATUS } from '../common/common.constants';
import { describeTransportError } from '../vacancies/vacancy-retry.helpers';
import {
  OPENAI_AUTHORIZATION_HEADER,
  OPENAI_BEARER_PREFIX,
  OPENAI_CHAT_COMPLETIONS_PATH,
  OPENAI_CHOICES_FIELD,
  OPENAI_MESSAGE_CONTENT_FIELD,
  OPENAI_MESSAGE_FIELD,
  OPENAI_MODEL_ID_FIELD,
  OPENAI_MODELS_DATA_FIELD,
  OPENAI_MODELS_PATH,
  OPENAI_RESPONSE_FORMAT_TYPE,
  VACANCY_AI_API_KEY_ENV_KEY,
  VACANCY_AI_CHAT_ROLE_USER,
  VACANCY_AI_MISSING_CONTENT_MESSAGE,
  VACANCY_AI_MODELS_LIST_FAILED_MESSAGE,
  VACANCY_AI_TEMPERATURE,
  VACANCY_AI_TRANSPORT_ERROR_MESSAGE,
  VACANCY_AI_UNEXPECTED_STATUS_MESSAGE,
} from './vacancy-ai.constants';
import type { AiChatRequest, AiProvider } from './vacancy-ai.interfaces';
import { isRecord, readString } from './vacancy-ai.parsers';
import type { AiChatResult, AiModelListResult } from './vacancy-ai.type';

function readMessageContent(payload: unknown): string | null {
  if (!isRecord(payload)) {
    return null;
  }

  const choices = payload[OPENAI_CHOICES_FIELD];

  if (!Array.isArray(choices)) {
    return null;
  }

  // noUncheckedIndexedAccess: элемент по индексу — T | undefined, даже после Array.isArray.
  const first: unknown = (choices as unknown[])[0];

  if (first === undefined || !isRecord(first)) {
    return null;
  }

  const message = first[OPENAI_MESSAGE_FIELD];

  return isRecord(message) ? readString(message, OPENAI_MESSAGE_CONTENT_FIELD) : null;
}

function readModelIds(payload: unknown): string[] | null {
  if (!isRecord(payload)) {
    return null;
  }

  const data = payload[OPENAI_MODELS_DATA_FIELD];

  if (!Array.isArray(data)) {
    return null;
  }

  const ids: string[] = [];

  for (const entry of data as unknown[]) {
    if (isRecord(entry)) {
      const id = readString(entry, OPENAI_MODEL_ID_FIELD);

      if (id !== null) {
        ids.push(id);
      }
    }
  }

  return ids;
}

/**
 * §4.12.1/§4.12.3: адаптер к OpenAI-совместимым API (запасной вариант — облачные
 * бесплатные тиры без дополнительного кода, см. §4.12.1). response_format вместо
 * format у Ollama, ключ — заголовком Authorization. Ключ не попадает ни в лог,
 * ни в сообщения об ошибке: describeTransportError берёт только error.message,
 * а сама ошибка сети/статуса не содержит заголовков запроса.
 */
@Injectable()
export class OpenAiAiProvider implements AiProvider {
  private readonly apiKey: string;

  constructor(
    private readonly http: HttpService,
    configService: ConfigService,
  ) {
    this.apiKey = configService.getOrThrow<string>(VACANCY_AI_API_KEY_ENV_KEY);
  }

  async chat(request: AiChatRequest): Promise<AiChatResult> {
    try {
      const response = await firstValueFrom(
        this.http.post<unknown>(
          OPENAI_CHAT_COMPLETIONS_PATH,
          {
            model: request.model,
            messages: [{ role: VACANCY_AI_CHAT_ROLE_USER, content: request.prompt }],
            response_format: {
              type: OPENAI_RESPONSE_FORMAT_TYPE,
              json_schema: {
                name: request.jsonSchema.name,
                schema: request.jsonSchema.schema,
                strict: true,
              },
            },
            temperature: VACANCY_AI_TEMPERATURE,
          },
          { timeout: request.timeoutMs, headers: this.buildAuthHeader() },
        ),
      );

      return this.interpretChatResponse(response.status, response.data);
    } catch (error) {
      return { ok: false, reason: describeTransportError(VACANCY_AI_TRANSPORT_ERROR_MESSAGE, error) };
    }
  }

  async listModels(): Promise<AiModelListResult> {
    try {
      const response = await firstValueFrom(
        this.http.get<unknown>(OPENAI_MODELS_PATH, { headers: this.buildAuthHeader() }),
      );

      return this.interpretModelsResponse(response.status, response.data);
    } catch (error) {
      return { ok: false, reason: describeTransportError(VACANCY_AI_TRANSPORT_ERROR_MESSAGE, error) };
    }
  }

  private buildAuthHeader(): Record<string, string> {
    return { [OPENAI_AUTHORIZATION_HEADER]: `${OPENAI_BEARER_PREFIX}${this.apiKey}` };
  }

  private interpretChatResponse(status: number, payload: unknown): AiChatResult {
    if (status !== OK_STATUS) {
      return { ok: false, reason: `${VACANCY_AI_UNEXPECTED_STATUS_MESSAGE} ${status}` };
    }

    const content = readMessageContent(payload);

    if (content === null) {
      return { ok: false, reason: VACANCY_AI_MISSING_CONTENT_MESSAGE };
    }

    return { ok: true, content };
  }

  private interpretModelsResponse(status: number, payload: unknown): AiModelListResult {
    if (status !== OK_STATUS) {
      return { ok: false, reason: `${VACANCY_AI_UNEXPECTED_STATUS_MESSAGE} ${status}` };
    }

    const models = readModelIds(payload);

    if (models === null) {
      return { ok: false, reason: VACANCY_AI_MODELS_LIST_FAILED_MESSAGE };
    }

    return { ok: true, models };
  }
}
