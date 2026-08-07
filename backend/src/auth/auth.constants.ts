/** Константы Basic Auth (§6): ключи метаданных и env, разбор заголовка, тексты ответа. */

/** Префикс намеренно проектный — чтобы ключ не столкнулся с метаданными Nest или библиотек. */
export const IS_PUBLIC_ROUTE_METADATA_KEY = 'jobHunter:isPublicRoute';

export const AUTH_USER_ENV_KEY = 'AUTH_USER';
export const AUTH_PASSWORD_ENV_KEY = 'AUTH_PASSWORD';

/** Сравнивается с lower-case: по RFC 7617 имя схемы регистронезависимо. */
export const BASIC_AUTH_SCHEME = 'basic';

export const AUTH_SCHEME_SEPARATOR = ' ';
export const CREDENTIALS_SEPARATOR = ':';

export const WWW_AUTHENTICATE_HEADER = 'WWW-Authenticate';

/** Ровно то значение, что зафиксировано в §6; charset="UTF-8" не добавляем. */
export const BASIC_AUTH_CHALLENGE = 'Basic realm="job-hunter"';

export const CREDENTIALS_DIGEST_ALGORITHM = 'sha256';

/** Аннотации обязательны: без них Buffer.from/toString не принимают эти литералы. */
export const BASE64_ENCODING: BufferEncoding = 'base64';
export const CREDENTIALS_ENCODING: BufferEncoding = 'utf8';

export const UNAUTHORIZED_MESSAGE = 'Требуется авторизация';

export const BASIC_AUTH_GUARD_CONTEXT = 'BasicAuthGuard';
