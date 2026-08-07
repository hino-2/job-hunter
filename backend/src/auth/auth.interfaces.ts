/**
 * Разобранное содержимое заголовка Authorization: Basic.
 * Оба поля — как их прислал клиент, без нормализации: сравнение байтовое.
 */
export interface BasicCredentials {
  user: string;
  password: string;
}
