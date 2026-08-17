import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

import { OK_STATUS } from '../common/common.constants';
import { describeTransportError } from '../vacancies/vacancy-retry.helpers';
import {
  OLLAMA_CHAT_PATH,
  OLLAMA_MESSAGE_CONTENT_FIELD,
  OLLAMA_MESSAGE_FIELD,
  OLLAMA_MODEL_NAME_FIELD,
  OLLAMA_TAGS_MODELS_FIELD,
  OLLAMA_TAGS_PATH,
  VACANCY_AI_CHAT_ROLE_USER,
  VACANCY_AI_MISSING_CONTENT_MESSAGE,
  VACANCY_AI_MODELS_LIST_FAILED_MESSAGE,
  VACANCY_AI_TEMPERATURE,
  VACANCY_AI_THINK,
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

  const message = payload[OLLAMA_MESSAGE_FIELD];

  return isRecord(message) ? readString(message, OLLAMA_MESSAGE_CONTENT_FIELD) : null;
}

function readModelNames(payload: unknown): string[] | null {
  if (!isRecord(payload)) {
    return null;
  }

  const models = payload[OLLAMA_TAGS_MODELS_FIELD];

  if (!Array.isArray(models)) {
    return null;
  }

  const names: string[] = [];

  for (const entry of models as unknown[]) {
    if (isRecord(entry)) {
      const name = readString(entry, OLLAMA_MODEL_NAME_FIELD);

      if (name !== null) {
        names.push(name);
      }
    }
  }

  return names;
}

/**
 * §4.12.1/§4.12.3: адаптер к Ollama. POST /api/chat со структурированным выводом
 * (format = JSON Schema), GET /api/tags — список моделей для VacancyAiCheckService.
 * Исключений наружу не выпускает — любой сбой транспорта или статуса возвращается
 * как { ok: false, reason }, разбор ответа доверен VacancyAiService/vacancy-ai.parsers.ts.
 */
@Injectable()
export class OllamaAiProvider implements AiProvider {
  constructor(private readonly http: HttpService) {}

  async chat(request: AiChatRequest): Promise<AiChatResult> {
    try {
      const response = await firstValueFrom(
        this.http.post<unknown>(
          OLLAMA_CHAT_PATH,
          {
            model: request.model,
            messages: [{ role: VACANCY_AI_CHAT_ROLE_USER, content: request.prompt }],
            format: request.jsonSchema.schema,
            stream: false,
            think: VACANCY_AI_THINK,
            options: { temperature: VACANCY_AI_TEMPERATURE },
          },
          { timeout: request.timeoutMs },
        ),
      );

      return this.interpretChatResponse(response.status, response.data);
    } catch (error) {
      return {
        ok: false,
        reason: describeTransportError(VACANCY_AI_TRANSPORT_ERROR_MESSAGE, error),
      };
    }
  }

  async listModels(): Promise<AiModelListResult> {
    try {
      const response = await firstValueFrom(this.http.get<unknown>(OLLAMA_TAGS_PATH));

      return this.interpretModelsResponse(response.status, response.data);
    } catch (error) {
      return {
        ok: false,
        reason: describeTransportError(VACANCY_AI_TRANSPORT_ERROR_MESSAGE, error),
      };
    }
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

    const models = readModelNames(payload);

    if (models === null) {
      return { ok: false, reason: VACANCY_AI_MODELS_LIST_FAILED_MESSAGE };
    }

    return { ok: true, models };
  }
}
