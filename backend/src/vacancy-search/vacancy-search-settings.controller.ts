import { Body, Controller, Get, Put } from '@nestjs/common';

import { UpdateVacancySearchSettingsDto } from './dto/update-vacancy-search-settings.dto';
import { VacancySearchSettingsDto } from './dto/vacancy-search-settings.dto';
import { VACANCY_SEARCH_SETTINGS_ROUTE } from './vacancy-search.constants';
import { VacancySearchSettingsService } from './vacancy-search-settings.service';

/** GET/PUT /api/vacancy-search-settings (§5.7). */
@Controller(VACANCY_SEARCH_SETTINGS_ROUTE)
export class VacancySearchSettingsController {
  constructor(private readonly settingsService: VacancySearchSettingsService) {}

  @Get()
  async find(): Promise<VacancySearchSettingsDto> {
    const entity = await this.settingsService.find();

    return VacancySearchSettingsDto.fromEntity(entity, this.settingsService.searchUrlTemplate);
  }

  @Put()
  async update(@Body() dto: UpdateVacancySearchSettingsDto): Promise<VacancySearchSettingsDto> {
    const entity = await this.settingsService.update(dto);

    return VacancySearchSettingsDto.fromEntity(entity, this.settingsService.searchUrlTemplate);
  }
}
