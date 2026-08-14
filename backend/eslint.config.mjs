import { createBackendConfig } from '../eslint.shared.mjs';

// Тонкая обёртка: сами правила — в eslint.shared.mjs, чтобы корневой конфиг
// (запуск `npm run lint` из корня монорепо) и этот применяли ровно один набор.
export default createBackendConfig({ tsconfigRootDir: import.meta.dirname });
