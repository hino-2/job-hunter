import { createHash, timingSafeEqual } from 'node:crypto';

import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';

import {
  AUTH_PASSWORD_ENV_KEY,
  AUTH_SCHEME_SEPARATOR,
  AUTH_USER_ENV_KEY,
  BASE64_ENCODING,
  BASIC_AUTH_CHALLENGE,
  BASIC_AUTH_GUARD_CONTEXT,
  BASIC_AUTH_SCHEME,
  CREDENTIALS_DIGEST_ALGORITHM,
  CREDENTIALS_ENCODING,
  CREDENTIALS_SEPARATOR,
  IS_PUBLIC_ROUTE_METADATA_KEY,
  UNAUTHORIZED_MESSAGE,
  WWW_AUTHENTICATE_HEADER,
} from './auth.constants';
import type { BasicCredentials } from './auth.interfaces';

function digest(value: string): Buffer {
  return createHash(CREDENTIALS_DIGEST_ALGORITHM).update(value, CREDENTIALS_ENCODING).digest();
}

/**
 * Возвращает null на любом мусоре, чтобы вызывающий шёл единственным путём deny → 401
 * и ни один кейс не превращался в 500:
 *  - заголовка нет; нет пробела; схема не Basic;
 *  - битый base64 — Buffer.from не бросает, а молча игнорирует недопустимые символы,
 *    и в получившемся мусоре почти наверняка нет двоеточия;
 *  - в декодированной строке нет двоеточия.
 *
 * Пароль с двоеточиями режется по ПЕРВОМУ вхождению — так требует RFC 7617.
 * Пустой логин/пароль спец-обработки не получают: это просто несовпадение дайджестов,
 * чтобы не появилось раннего выхода с другим временем ответа.
 */
function parseBasicCredentials(header: string | undefined): BasicCredentials | null {
  if (header === undefined) {
    return null;
  }

  const schemeEnd = header.indexOf(AUTH_SCHEME_SEPARATOR);

  if (schemeEnd < 0) {
    return null;
  }

  if (header.slice(0, schemeEnd).toLowerCase() !== BASIC_AUTH_SCHEME) {
    return null;
  }

  const decoded = Buffer.from(header.slice(schemeEnd + 1), BASE64_ENCODING).toString(
    CREDENTIALS_ENCODING,
  );
  const credentialsSeparator = decoded.indexOf(CREDENTIALS_SEPARATOR);

  if (credentialsSeparator < 0) {
    return null;
  }

  return {
    user: decoded.slice(0, credentialsSeparator),
    password: decoded.slice(credentialsSeparator + 1),
  };
}

/**
 * Глобальный Basic Auth (§6). Закрывает все /api/*, кроме помеченных @Public()
 * (сейчас это только GET /api/health).
 *
 * Регистрируется вручную в configureApp через app.useGlobalGuards(), а не через APP_GUARD:
 * configureApp — единственная точка настройки, общая для main.ts и e2e-фабрики, и именно
 * это даёт паритет прод/тест. @Injectable() оставлен, чтобы переход на APP_GUARD при
 * необходимости был тривиальным.
 */
@Injectable()
export class BasicAuthGuard implements CanActivate {
  private readonly logger = new Logger(BASIC_AUTH_GUARD_CONTEXT);
  /** В памяти живут только дайджесты: plaintext ожидаемых кред в поля класса не попадает. */
  private readonly expectedUserDigest: Buffer;
  private readonly expectedPasswordDigest: Buffer;

  constructor(
    private readonly reflector: Reflector,
    configService: ConfigService,
  ) {
    this.expectedUserDigest = digest(configService.getOrThrow<string>(AUTH_USER_ENV_KEY));
    this.expectedPasswordDigest = digest(configService.getOrThrow<string>(AUTH_PASSWORD_ENV_KEY));
  }

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(
      IS_PUBLIC_ROUTE_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic === true) {
      return true;
    }

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const credentials = parseBasicCredentials(request.headers.authorization);

    if (credentials !== null && this.matchesExpected(credentials)) {
      return true;
    }

    return this.deny(request, http.getResponse<Response>(), credentials !== null);
  }

  /**
   * Сравниваются не строки, а SHA-256-дайджесты: они всегда по 32 байта, поэтому
   * timingSafeEqual не бросает «Input buffers must have the same byte length», а длина
   * пароля не наблюдаема. Логин и пароль сравниваются раздельно, иначе AUTH_USER
   * с двоеточием давал бы неоднозначное разбиение.
   *
   * Оба сравнения вычисляются до возврата: ранний выход по логину создал бы
   * наблюдаемую разницу во времени ответа.
   */
  private matchesExpected(credentials: BasicCredentials): boolean {
    const userMatches = timingSafeEqual(digest(credentials.user), this.expectedUserDigest);
    const passwordMatches = timingSafeEqual(
      digest(credentials.password),
      this.expectedPasswordDigest,
    );

    return userMatches && passwordMatches;
  }

  /**
   * Challenge ставится ДО throw: exception filter отвечает через response.status().json(),
   * который ранее выставленные заголовки не сбрасывает, поэтому WWW-Authenticate доживает
   * до браузера и тот показывает нативный диалог логина.
   *
   * В лог идут только метод и путь. Ни заголовок Authorization, ни пароль, ни ЛОГИН
   * не логируются: в поле имени пользователь мог случайно набрать пароль.
   */
  private deny(request: Request, response: Response, hadBasicCredentials: boolean): never {
    response.setHeader(WWW_AUTHENTICATE_HEADER, BASIC_AUTH_CHALLENGE);

    const location = `${request.method} ${request.url}`;

    if (hadBasicCredentials) {
      this.logger.warn(`Неверные креды Basic Auth: ${location}`);
    } else {
      this.logger.debug(`Запрос без Basic-кред: ${location}`);
    }

    throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
  }
}
