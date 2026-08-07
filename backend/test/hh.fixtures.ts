import { TEST_VACANCY_ID } from './test.constants';

/**
 * Ответ hh.ru на GET /vacancies/{id} (§4.1). Поля за пределами четырёх нужных
 * оставлены намеренно: тест обязан подтверждать, что лишнее игнорируется.
 */
export function buildHhVacancyPayload(
  overrides?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    id: TEST_VACANCY_ID,
    name: 'Node.js Developer',
    archived: false,
    type: { id: 'open', name: 'Открытая' },
    employer: { id: '1455', name: 'Acme' },
    salary: { from: 300000, currency: 'RUR' },
    ...overrides,
  };
}
