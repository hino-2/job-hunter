import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { access, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { firstValueFrom } from 'rxjs';

import { OK_STATUS } from '../common/common.constants';
import {
  buildCompanyLogoFileName,
  buildCompanyLogoRedirectGuard,
  isCompanyLogoFileName,
  resolveLogoContentType,
  resolveLogoExtension,
} from './company-logo.helpers';
import {
  COMPANY_LOGO_DIR_ENV_KEY,
  COMPANY_LOGO_FILE_KEY_PATTERN,
  COMPANY_LOGO_FILE_NAME_SEPARATOR,
  COMPANY_LOGO_INVALID_FILE_KEY_MESSAGE,
  COMPANY_LOGO_MAX_BYTES,
  COMPANY_LOGO_TMP_SUFFIX,
  COMPANY_LOGO_TOO_LARGE_MESSAGE,
  COMPANY_LOGO_TRANSPORT_ERROR_MESSAGE,
  COMPANY_LOGO_UNEXPECTED_STATUS_MESSAGE,
  COMPANY_LOGO_UNSUPPORTED_CONTENT_TYPE_MESSAGE,
  COMPANY_LOGO_WRITE_ERROR_MESSAGE,
} from './company-logo.constants';
import type { CompanyLogoContent, CompanyLogoDownloadRequest } from './company-logo.interfaces';

/**
 * axios с responseType: 'arraybuffer' в среде Node отдаёт Buffer, но типизирован как
 * ArrayBuffer|Buffer в зависимости от адаптера — сужаем явно, а не приводим unknown
 * через as (§10 п.4).
 */
function toBuffer(data: unknown): Buffer | null {
  if (Buffer.isBuffer(data)) {
    return data;
  }

  if (data instanceof ArrayBuffer) {
    return Buffer.from(data);
  }

  return null;
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Различает ENOENT (writeFile не успел создать .tmp-файл — штатно после сбоя вне
 * fs) от прочих ошибок очистки. NodeJS.ErrnoException — амбиентный тип @types/node,
 * а не any (§10 п.4): unknown сужается предикатом, а не безусловным приведением.
 */
function isEnoentError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT';
}

/**
 * Скачивание, валидация и чтение логотипов компаний (§4.10). Не знает ни про
 * Application, ни про правила §4.3 — принимает fileKey (application.id) и абсолютный
 * URL, отдаёт имя файла на диске либо null.
 *
 * Ни один метод не выпускает исключение наружу: дохлый CDN или недоступный каталог
 * не должны превращать штатный исход синхронизации §4.5 в 500. Каждая ветка отказа —
 * это logger.warn с причиной и return null/false, ровно тот же принцип, что у
 * hh-api.service.ts/getmatch-api.service.ts.
 */
@Injectable()
export class CompanyLogoService {
  private readonly logger = new Logger(CompanyLogoService.name);
  private readonly dir: string;

  constructor(
    private readonly http: HttpService,
    configService: ConfigService,
  ) {
    this.dir = configService.getOrThrow<string>(COMPANY_LOGO_DIR_ENV_KEY);
  }

  async download(request: CompanyLogoDownloadRequest): Promise<string | null> {
    const { fileKey, logoUrl, allowedHostPattern, acquireSlot } = request;

    if (!COMPANY_LOGO_FILE_KEY_PATTERN.test(fileKey)) {
      this.logger.warn(`${COMPANY_LOGO_INVALID_FILE_KEY_MESSAGE}: ${fileKey}`);

      return null;
    }

    // §4.11.2: скачивание логотипа с hhcdn.ru идёт через тот же троттл, что и
    // страница вакансии — источники без лимита частоты (getmatch.ru) слот не присылают.
    await acquireSlot?.();

    let status: number;
    let data: unknown;
    let contentTypeHeader: string | undefined;

    try {
      // beforeRedirect повторяет проверку allow-list на КАЖДОМ хопе редиректа (§4.10,
      // SSRF): resolveVacancyLogoUrl отсекает только исходный URL, а
      // maxRedirects в фабрике опций разрешает CDN 3xx-нуть до трёх раз подряд —
      // без этой проверки на произвольный хост. Бросок внутри guard'а долетает сюда
      // как ошибка запроса и ловится тем же catch, что и любой другой транспортный сбой.
      const response = await firstValueFrom(
        this.http.get<unknown>(logoUrl, {
          beforeRedirect: buildCompanyLogoRedirectGuard(allowedHostPattern),
        }),
      );

      status = response.status;
      data = response.data;
      // AxiosHeaderValue допускает и null, и число — сужаем явно, а не приводим as (§10 п.4).
      const rawContentType: unknown = response.headers['content-type'];

      contentTypeHeader = typeof rawContentType === 'string' ? rawContentType : undefined;
    } catch (error) {
      this.logger.warn(
        `${COMPANY_LOGO_TRANSPORT_ERROR_MESSAGE} (${fileKey}): ${describeError(error)}`,
      );

      return null;
    }

    if (status !== OK_STATUS) {
      this.logger.warn(`${COMPANY_LOGO_UNEXPECTED_STATUS_MESSAGE} ${status} (${fileKey})`);

      return null;
    }

    const extension = resolveLogoExtension(contentTypeHeader);

    if (extension === null) {
      this.logger.warn(
        `${COMPANY_LOGO_UNSUPPORTED_CONTENT_TYPE_MESSAGE}: ${contentTypeHeader ?? 'нет заголовка'} (${fileKey})`,
      );

      return null;
    }

    const buffer = toBuffer(data);

    if (buffer === null || buffer.length === 0 || buffer.length > COMPANY_LOGO_MAX_BYTES) {
      this.logger.warn(`${COMPANY_LOGO_TOO_LARGE_MESSAGE} (${fileKey})`);

      return null;
    }

    const fileName = buildCompanyLogoFileName(fileKey, extension);
    // Уникальный суффикс на каждый вызов download(): два параллельных прогона одной
    // записи (ручной 🔄 наперегонки с sync-open) иначе писали бы в один и тот же
    // .tmp-путь и могли переименовать в финальный файл чужой недописанный буфер.
    const tmpPath = join(
      this.dir,
      `${fileName}${COMPANY_LOGO_TMP_SUFFIX}${COMPANY_LOGO_FILE_NAME_SEPARATOR}${randomUUID()}`,
    );
    const finalPath = join(this.dir, fileName);

    try {
      // mkdir лениво, только на этом пути: exists()/read() каталог не создают.
      await mkdir(this.dir, { recursive: true });
      await writeFile(tmpPath, buffer);
      // rename атомарен: финальный файл заменяется целиком, а не дописывается.
      await rename(tmpPath, finalPath);
    } catch (error) {
      this.logger.warn(`${COMPANY_LOGO_WRITE_ERROR_MESSAGE} (${fileKey}): ${describeError(error)}`);
      await this.cleanupTmpFile(tmpPath);

      return null;
    }

    return fileName;
  }

  /**
   * Лучшая попытка убрать .tmp-файл после сбоя writeFile/rename (§4.10) — иначе
   * каждый неуспешный downloads() оставлял бы в каталоге логотипов мусор навечно.
   * ENOENT (writeFile не успел создать файл) — штатный случай, не логируется.
   */
  private async cleanupTmpFile(tmpPath: string): Promise<void> {
    try {
      await unlink(tmpPath);
    } catch (error) {
      if (!isEnoentError(error)) {
        this.logger.warn(
          `${COMPANY_LOGO_WRITE_ERROR_MESSAGE} (очистка .tmp): ${describeError(error)}`,
        );
      }
    }
  }

  async exists(fileName: string): Promise<boolean> {
    if (!isCompanyLogoFileName(fileName)) {
      return false;
    }

    try {
      await access(join(this.dir, fileName));

      return true;
    } catch {
      return false;
    }
  }

  async read(fileName: string): Promise<CompanyLogoContent | null> {
    if (!isCompanyLogoFileName(fileName)) {
      return null;
    }

    const contentType = resolveLogoContentType(fileName);

    if (contentType === null) {
      return null;
    }

    try {
      const buffer = await readFile(join(this.dir, fileName));

      return { buffer, contentType, length: buffer.length };
    } catch {
      // ENOENT — штатный сценарий после пересоздания контейнера (§4.10): каталог
      // эфемерный, колонка осталась заполненной. Логировать нечего: следующая
      // синхронизация скачает файл заново.
      return null;
    }
  }
}
