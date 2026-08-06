import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

import {
  API_PATH_PREFIX,
  BUILD_OUT_DIR,
  DEV_API_PROXY_TARGET,
  DEV_SERVER_PORT,
  TEST_INCLUDE_GLOBS,
  TEST_SETUP_FILES,
  // Расширение обязательно: нативный загрузчик конфигов Vite 8 не дорезолвивает пути.
} from './vite.constants.ts';

export default defineConfig({
  plugins: [react()],
  server: {
    port: DEV_SERVER_PORT,
    strictPort: true,
    proxy: {
      // В Docker этим занимается nginx; здесь — только для локального dev-режима.
      [API_PATH_PREFIX]: {
        target: DEV_API_PROXY_TARGET,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: BUILD_OUT_DIR,
    sourcemap: false,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: TEST_SETUP_FILES,
    include: TEST_INCLUDE_GLOBS,
  },
});
