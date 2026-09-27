import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { CompanyLogoService } from '../logos/company-logo.service';
import { buildSourceIconUrl } from './source-icon.helpers';
import {
  SOURCE_ICON_ALLOWED_HOST_PATTERNS,
  SOURCE_ICON_DOWNLOAD_FAILED_MESSAGE,
  SOURCE_ICON_RETRY_AFTER_MS,
  SOURCE_SITE_BASE_URL_ENV_KEYS,
} from './source-icon.constants';
import type { SourceIconSource } from './source-icon.type';

/**
 * §5.8: скачивание и in-process кэш иконки сайта-источника вакансий поверх logos/
 * (§4.10) — тот же каталог, тот же CompanyLogoService.download, только fileKey тут
 * не id записи, а имя источника. Ленивое: до первого запроса ни для одного источника
 * ничего не скачивается.
 */
@Injectable()
export class SourceIconService {
  private readonly logger = new Logger(SourceIconService.name);

  /** Разрешённое имя файла (`<SOURCE>.<ext>`) на источник — попадание возвращается сразу. */
  private readonly fileNames = new Map<SourceIconSource, string>();

  /**
   * Первый рендер списка откликов/лидов запрашивает иконку одного и того же источника
   * из нескольких строк параллельно (до 12 записей на страницу) — без дедупликации
   * in-flight запросов это стало бы 12 одинаковыми исходящими скачиваниями одной и той
   * же favicon.ico вместо одного.
   */
  private readonly inFlight = new Map<SourceIconSource, Promise<string | null>>();

  /**
   * Негативный кэш: пока не прошёл SOURCE_ICON_RETRY_AFTER_MS с последнего провала,
   * повторный запрос отдаёт null без похода в сеть — иначе источник, отдающий 403/5xx
   * на favicon, получал бы по исходящему запросу на КАЖДЫЙ рендер КАЖДОЙ строки.
   */
  private readonly failedAt = new Map<SourceIconSource, number>();

  constructor(
    private readonly logos: CompanyLogoService,
    private readonly configService: ConfigService,
  ) {}

  async resolveFileName(source: SourceIconSource): Promise<string | null> {
    const cached = this.fileNames.get(source);

    if (cached !== undefined) {
      return cached;
    }

    const failedAt = this.failedAt.get(source);

    if (failedAt !== undefined && Date.now() - failedAt < SOURCE_ICON_RETRY_AFTER_MS) {
      return null;
    }

    const inFlight = this.inFlight.get(source);

    if (inFlight !== undefined) {
      return inFlight;
    }

    const download = this.download(source).finally(() => this.inFlight.delete(source));

    this.inFlight.set(source, download);

    return download;
  }

  private async download(source: SourceIconSource): Promise<string | null> {
    const siteBaseUrl = this.configService.getOrThrow<string>(
      SOURCE_SITE_BASE_URL_ENV_KEYS[source],
    );
    const iconUrl = buildSourceIconUrl(siteBaseUrl, source);

    if (iconUrl === null) {
      // Единственная ветка, где логируем сами: buildSourceIconUrl отбраковал URL/хост
      // ДО похода в сеть, this.logos.download() тут не вызывается и, значит, никто
      // больше причину не запишет (зеркало VacancyLogoService.resolveLogoFile — там
      // по той же причине нет warn, когда logoUrl отсутствует).
      this.failedAt.set(source, Date.now());
      this.logger.warn(`${SOURCE_ICON_DOWNLOAD_FAILED_MESSAGE}: ${source}`);

      return null;
    }

    // Намеренно без acquireSlot (§4.11.2 — троттл нужен только массовому прогону
    // выдачи): за весь процесс сюда попадает максимум один сетевой запрос на источник
    // раз в час (см. failedAt выше), это не может приблизиться ни к одному лимиту.
    const fileName = await this.logos.download({
      fileKey: source,
      logoUrl: iconUrl,
      allowedHostPattern: SOURCE_ICON_ALLOWED_HOST_PATTERNS[source],
    });

    if (fileName === null) {
      // Здесь НЕ логируем: CompanyLogoService.download уже записал свой warn с
      // конкретной причиной (таймаут, неожиданный статус, неподдерживаемый
      // Content-Type и т.д.) — тот же принцип, что у VacancyLogoService.resolveLogoFile,
      // которая тоже не дублирует предупреждение поверх download().
      this.failedAt.set(source, Date.now());

      return null;
    }

    this.fileNames.set(source, fileName);

    return fileName;
  }
}
