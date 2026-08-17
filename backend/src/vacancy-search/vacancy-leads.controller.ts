import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ApplicationDto } from '../applications/dto/application.dto';
import { readCompanyLogoOrFail } from '../logos/company-logo-response.helpers';
import {
  CONTENT_TYPE_OPTIONS_HEADER,
  CONTENT_TYPE_OPTIONS_NOSNIFF,
  LOGO_CACHE_CONTROL_HEADER,
  LOGO_CACHE_CONTROL_VALUE,
} from '../logos/company-logo.constants';
import { CompanyLogoService } from '../logos/company-logo.service';
import { FindVacancyLeadsQueryDto } from './dto/find-vacancy-leads.query.dto';
import { ScanAcceptedDto } from './dto/scan-accepted.dto';
import { ScanStatusDto } from './dto/scan-status.dto';
import { ScanStopAcceptedDto } from './dto/scan-stop-accepted.dto';
import { StartScanDto } from './dto/start-scan.dto';
import { UpdateVacancyLeadDto } from './dto/update-vacancy-lead.dto';
import { VacancyLeadDto } from './dto/vacancy-lead.dto';
import { isResumablePosition } from './vacancy-scan-position.helpers';
import { VacancyScanPositionService } from './vacancy-scan-position.service';
import { VacancyScanStateService } from './vacancy-scan-state.service';
import { VacancyScanService } from './vacancy-scan.service';
import { VacancyLeadApplicationService } from './vacancy-lead-application.service';
import { serializeVacancyRefKey } from './vacancy-lead-key.helpers';
import { VacancyLeadsService } from './vacancy-leads.service';
import { VacancySearchSettingsService } from './vacancy-search-settings.service';
import {
  DEFAULT_SCAN_MODE,
  VACANCY_LEAD_APPLY_ROUTE,
  VACANCY_LEAD_BY_ID_ROUTE,
  VACANCY_LEAD_ID_PARAM,
  VACANCY_LEAD_LOGO_ROUTE,
  VACANCY_LEADS_ROUTE,
  VACANCY_LEADS_SCAN_ROUTE,
  VACANCY_LEADS_SCAN_STATUS_ROUTE,
  VACANCY_LEADS_SCAN_STOP_ROUTE,
  VACANCY_SCAN_MAX_PAGES_ENV_KEY,
} from './vacancy-search.constants';
import type { VacancyScanResumeState } from './vacancy-search.interfaces';

/**
 * Список/скрытие лидов, создание отклика из лида (§5.7) и запуск/остановка/статус
 * прогона поиска (§4.11.12).
 *
 * ВАЖНО: маршруты 'scan', 'scan/stop', 'scan/status', ':id/logo' и ':id/apply' объявлены
 * ВЫШЕ метода с ':id', иначе Express сматчил бы их хвост как значение :id — то же
 * правило, что у sync-open/:id/logo в ApplicationsController (§5.2, §4.10, шаг №26 §14).
 */
@Controller(VACANCY_LEADS_ROUTE)
export class VacancyLeadsController {
  private readonly maxPages: number;

  constructor(
    private readonly leadsService: VacancyLeadsService,
    private readonly scanService: VacancyScanService,
    private readonly scanStateService: VacancyScanStateService,
    private readonly positionService: VacancyScanPositionService,
    private readonly settingsService: VacancySearchSettingsService,
    private readonly companyLogoService: CompanyLogoService,
    private readonly leadApplicationService: VacancyLeadApplicationService,
    configService: ConfigService,
  ) {
    this.maxPages = configService.getOrThrow<number>(VACANCY_SCAN_MAX_PAGES_ENV_KEY);
  }

  @Get()
  async findAll(@Query() query: FindVacancyLeadsQueryDto): Promise<VacancyLeadDto[]> {
    const [entities, appliedKeys] = await Promise.all([
      this.leadsService.findAll(query),
      this.leadApplicationService.findAppliedRefKeys(),
    ]);

    return entities.map((entity) =>
      VacancyLeadDto.fromEntity(
        entity,
        appliedKeys.has(
          serializeVacancyRefKey({ source: entity.source, externalId: entity.externalId }),
        ),
      ),
    );
  }

  /**
   * POST /api/vacancy-leads/scan (§5.7, §4.11.9, §4.11.12) — 202 сразу, 409 при
   * уже идущем прогоне либо (mode === 'RESUME') при отсутствии валидной сохранённой
   * позиции.
   */
  @Post(VACANCY_LEADS_SCAN_ROUTE)
  @HttpCode(HttpStatus.ACCEPTED)
  async scan(@Body() dto: StartScanDto): Promise<ScanAcceptedDto> {
    const startedAt = await this.scanService.start(dto.mode ?? DEFAULT_SCAN_MODE);

    return ScanAcceptedDto.fromStartedAt(startedAt);
  }

  /** POST /api/vacancy-leads/scan/stop (§5.7, §4.11.12) — 202 сразу, 409 если прогон не идёт. */
  @Post(VACANCY_LEADS_SCAN_STOP_ROUTE)
  @HttpCode(HttpStatus.ACCEPTED)
  stop(): ScanStopAcceptedDto {
    this.scanService.requestStop();

    return ScanStopAcceptedDto.create();
  }

  /** GET /api/vacancy-leads/scan/status (§5.7, §4.11.12) — прогресс во время прогона, итог после, доступность «Продолжить». */
  @Get(VACANCY_LEADS_SCAN_STATUS_ROUTE)
  async status(): Promise<ScanStatusDto> {
    const [position, settings] = await Promise.all([
      this.positionService.load(),
      this.settingsService.getSnapshot(),
    ]);

    const available = isResumablePosition(position, settings.searchUrlTemplate, this.maxPages);
    const resume: VacancyScanResumeState = {
      available,
      nextPage: available ? position.nextPage : null,
    };

    return ScanStatusDto.fromState(this.scanStateService.snapshot(), resume);
  }

  /**
   * GET /api/vacancy-leads/:id/logo (§4.10, §4.11, §5.7, шаг №26 §14) — байты логотипа
   * компании лида, ровно та же обвязка, что у ApplicationsController.findLogo: заголовки
   * кэша и nosniff ставим сами, @Res не используется — иначе перестал бы работать
   * HttpExceptionFilter (§5.5).
   */
  @Get(VACANCY_LEAD_LOGO_ROUTE)
  @Header(LOGO_CACHE_CONTROL_HEADER, LOGO_CACHE_CONTROL_VALUE)
  @Header(CONTENT_TYPE_OPTIONS_HEADER, CONTENT_TYPE_OPTIONS_NOSNIFF)
  async findLogo(@Param(VACANCY_LEAD_ID_PARAM, ParseUUIDPipe) id: string): Promise<StreamableFile> {
    const entity = await this.leadsService.findOneOrFail(id);

    return readCompanyLogoOrFail(this.companyLogoService, entity.companyLogoFile);
  }

  /**
   * POST /api/vacancy-leads/:id/apply (§5.7) — создаёт Application из лида ровно тем же
   * путём, что ручное создание (§4.2, §4.4/§4.10). Тела запроса нет, @HttpCode не
   * ставится — дефолтный 201 верен: ресурс создаётся. 404 — нет лида, 409 — отклик по
   * этой паре (vacancy_source, vacancy_external_id) уже создан. Закрыт глобальным Basic
   * Auth, @Public() не ставится.
   */
  @Post(VACANCY_LEAD_APPLY_ROUTE)
  async apply(@Param(VACANCY_LEAD_ID_PARAM, ParseUUIDPipe) id: string): Promise<ApplicationDto> {
    const entity = await this.leadApplicationService.applyToLead(id);

    return ApplicationDto.fromEntity(entity);
  }

  @Patch(VACANCY_LEAD_BY_ID_ROUTE)
  async update(
    @Param(VACANCY_LEAD_ID_PARAM, ParseUUIDPipe) id: string,
    @Body() dto: UpdateVacancyLeadDto,
  ): Promise<VacancyLeadDto> {
    const entity = await this.leadsService.setHidden(id, dto.hidden);
    const hasApplication = await this.leadApplicationService.hasApplication(entity);

    return VacancyLeadDto.fromEntity(entity, hasApplication);
  }
}
