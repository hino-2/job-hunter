import type { AiTitleVerdict } from './vacancy-ai.interfaces';

/** Результат одного запроса к модели: текст ответа (ещё не разобранный JSON) либо причина сбоя. */
export type AiChatResult = { ok: true; content: string } | { ok: false; reason: string };

/** §4.12.4: результат GET /api/tags (Ollama) / GET /v1/models (OpenAI) — имена доступных моделей. */
export type AiModelListResult = { ok: true; models: string[] } | { ok: false; reason: string };

/**
 * §4.11.4 этап 1 / §4.12.3: любой сбой (таймаут, недоступный контейнер, невалидный JSON,
 * длина массива вердиктов ≠ размеру батча) — { ok: false, reason }, без исключений наружу.
 */
export type AiTitleBatchResult =
  { ok: true; verdicts: AiTitleVerdict[] } | { ok: false; reason: string };

/** §4.11.4 этап 4: reason уже обрезан вызывающим (vacancy-lead.builder.ts) — здесь он «как есть». */
export type AiDescriptionResult =
  { ok: true; matches: boolean; reason: string } | { ok: false; reason: string };
