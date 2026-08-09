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
import { PreviewVacancyDto } from './dto/preview-vacancy.dto';
import { VacancyPreviewDto } from './dto/vacancy-preview.dto';
import {
  VACANCIES_ROUTE,
  VACANCY_PREVIEW_ROUTE,
  VACANCY_UPSTREAM_FAILED_MESSAGE,
} from './vacancies.constants';
import { VacancyProviderRegistry } from './vacancy-provider.registry';
import type { VacancyFetchFailure } from './vacancies.interfaces';

@Controller(VACANCIES_ROUTE)
export class VacanciesController {
  constructor(private readonly registry: VacancyProviderRegistry) {}

  /**
   * POST /api/vacancies/preview (§5.3) — данные вакансии по ссылке, без записи в БД.
   *
   * @HttpCode(OK): по умолчанию Nest отвечает на POST 201, а спецификация требует 200 —
   * ресурс здесь не создаётся.
   *
   * Отображение исхода в HTTP-статус живёт в контроллере, а не в сервисе: сервис
   * говорит на языке §4.5 (его же понимает синхронизация), контроллер — на языке HTTP.
   */
  @Post(VACANCY_PREVIEW_ROUTE)
  @HttpCode(HttpStatus.OK)
  async preview(@Body() dto: PreviewVacancyDto): Promise<VacancyPreviewDto> {
    const resolution = this.registry.resolveByUrl(dto.url);

    if (resolution === null) {
      return VacancyPreviewDto.empty();
    }

    const { ref, provider } = resolution;
    const result = await provider.fetchVacancy(ref.externalId);

    if (result.outcome === SYNC_OUTCOME.OK) {
      return VacancyPreviewDto.fromVacancy(ref, result.vacancy);
    }

    throw this.toHttpException(result);
  }

  /** NOT_FOUND → 404, всё остальное (429, 5xx, сеть, таймаут, битый ответ) → 502 (§5.3). */
  private toHttpException(failure: VacancyFetchFailure): NotFoundException | BadGatewayException {
    if (failure.outcome === SYNC_OUTCOME.NOT_FOUND) {
      return new NotFoundException(failure.message);
    }

    return new BadGatewayException(`${VACANCY_UPSTREAM_FAILED_MESSAGE}: ${failure.message}`);
  }
}
