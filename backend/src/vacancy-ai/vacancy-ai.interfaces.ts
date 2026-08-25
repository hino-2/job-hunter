import type { AiChatResult, AiModelListResult } from './vacancy-ai.type';

/**
 * Формы данных ИИ-отбора (§4.12), общие для сервиса (vacancy-ai.service.ts) и обоих
 * адаптеров (ollama-ai.provider.ts, openai-ai.provider.ts). AiProvider — единственная
 * граница между VacancyAiService и конкретным протоколом: сервис не знает, идёт ли
 * запрос в Ollama или в OpenAI-совместимый API.
 */

/** §4.12.3: имя схемы для response_format (OpenAI) и сама JSON Schema (общая для обоих провайдеров). */
export interface AiJsonSchema {
  name: string;
  schema: Record<string, unknown>;
}

/** Один запрос к модели — весь промпт уже отрендерен вызывающим (VacancyAiService). */
export interface AiChatRequest {
  model: string;
  prompt: string;
  jsonSchema: AiJsonSchema;
  timeoutMs: number;
}

/**
 * §4.12.1: адаптер к конкретному протоколу (ollama | openai). Оба метода никогда
 * не бросают — сбой сети/статуса возвращается как { ok: false, reason }, а
 * VacancyAiService дополнительно оборачивает вызов в try/catch на случай
 * непредвиденного исключения в самом адаптере (защита в глубину).
 */
export interface AiProvider {
  chat(request: AiChatRequest): Promise<AiChatResult>;
  listModels(): Promise<AiModelListResult>;
}

/** §4.11.4 этап 1: одно название вакансии батча вместе с компанией (для formatTitlesBlock). */
export interface AiTitleBatchItem {
  title: string;
  company: string;
}

/** §4.12.3: один вердикт из ответа модели по названию — index не используется для сопоставления (см. vacancy-ai.parsers.ts), только для диагностики. */
export interface AiTitleVerdict {
  index: number;
  matches: boolean;
  reason: string;
}

/**
 * §4.12.3 этап 4: вердикт модели по описанию. evidence — вход проверки на
 * галлюцинацию (isEvidenceGrounded, vacancy-ai.helpers.ts) и НИКОГДА не сохраняется
 * в БД (§4.12.3) — в отличие от reason, который уходит в ai_description_reason.
 */
export interface AiDescriptionVerdict {
  matches: boolean;
  reason: string;
  evidence: string;
}

/** §4.11.4 этап 1 / §4.12.2: вход judgeTitles — уже готовый снимок настроек и батч названий. */
export interface AiTitleBatchRequest {
  titlePrompt: string;
  keywords: string[];
  items: AiTitleBatchItem[];
}

/** §4.11.4 этап 4 / §4.12.2: вход judgeDescription — одна вакансия, описание ещё не обрезано. */
export interface AiDescriptionRequest {
  descriptionPrompt: string;
  keywords: string[];
  title: string;
  company: string;
  description: string;
}
