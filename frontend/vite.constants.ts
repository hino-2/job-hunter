/** Константы сборки и dev-сервера. Импортируются vite.config.ts. */
export const DEV_SERVER_PORT = 5173;

/** Куда dev-сервер проксирует /api при локальном запуске без Docker. */
export const DEV_API_PROXY_TARGET = 'http://127.0.0.1:3000';

export const API_PATH_PREFIX = '/api';

export const BUILD_OUT_DIR = 'dist';

export const TEST_SETUP_FILES = ['./src/test/setup.ts'];

export const TEST_INCLUDE_GLOBS = ['src/**/*.{test,spec}.{ts,tsx}'];
