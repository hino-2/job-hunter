import {
  BadGatewayException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
} from '@nestjs/common';

import { SYNC_OUTCOME } from '../applications/applications.constants';
import { HhPreviewDto } from './dto/hh-preview.dto';
import { PreviewVacancyDto } from './dto/preview-vacancy.dto';
import { HhApiService } from './hh-api.service';
import { parseHhVacancyId } from './hh-url.parser';
import { HH_PREVIEW_ROUTE, HH_ROUTE, HH_UPSTREAM_FAILED_MESSAGE } from './hh.constants';
import type { HhFetchFailure } from './hh.interfaces';

@Controller(HH_ROUTE)
export class HhController {
  constructor(private readonly hhApiService: HhApiService) {}

  /**
   * POST /api/hh/preview (§5.3) — данные вакансии по ссылке, без записи в БД.
   *
   * @HttpCode(OK): по умолчанию Nest отвечает на POST 201, а спецификация требует 200 —
   * ресурс здесь не создаётся.
   *
   * Отображение исхода в HTTP-статус живёт в контроллере, а не в сервисе: сервис
   * говорит на языке §4.5 (его же понимает синхронизация в шаге 6), контроллер —
   * на языке HTTP.
   */
  @Post(HH_PREVIEW_ROUTE)
  @HttpCode(HttpStatus.OK)
  async preview(@Body() dto: PreviewVacancyDto): Promise<HhPreviewDto> {
    const hhVacancyId = parseHhVacancyId(dto.url);

    if (hhVacancyId === null) {
      return HhPreviewDto.empty();
    }

    const result = await this.hhApiService.fetchVacancy(hhVacancyId);

    if (result.outcome === SYNC_OUTCOME.OK) {
      return HhPreviewDto.fromVacancy(hhVacancyId, result.vacancy);
    }

    throw this.toHttpException(result);
  }

  /** NOT_FOUND → 404, всё остальное (429, 5xx, сеть, таймаут, битый JSON) → 502 (§5.3). */
  private toHttpException(failure: HhFetchFailure): NotFoundException | BadGatewayException {
    if (failure.outcome === SYNC_OUTCOME.NOT_FOUND) {
      return new NotFoundException(failure.message);
    }

    return new BadGatewayException(`${HH_UPSTREAM_FAILED_MESSAGE}: ${failure.message}`);
  }
}
