import axios from 'axios';

import { API_BASE_URL, API_TIMEOUT_MS } from '../constants/api.constants';

/**
 * Единственный HTTP-клиент приложения.
 * Basic Auth подставляет сам браузер после нативного диалога логина —
 * никаких токенов и заголовков авторизации во фронте не хранится.
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
});
