/** Единый способ превратить unknown-ошибку в текст для лога (§10 п.4 — никакого any). */
export function describeErrorReason(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
