import { ConflictException, Injectable, Logger } from '@nestjs/common';

import type { Application } from '../applications/application.entity';
import { ApplicationsService } from '../applications/applications.service';
import type { CreateApplicationDto } from '../applications/dto/create-application.dto';
import { normalizeVacancyPosition } from '../vacancies/vacancy-position.helpers';
import { serializeVacancyRefKey } from './vacancy-lead-key.helpers';
import type { VacancyLead } from './vacancy-lead.entity';
import { VacancyLeadsService } from './vacancy-leads.service';
import { LEAD_ALREADY_APPLIED_MESSAGE, LEAD_APPLIED_LOG_MESSAGE } from './vacancy-search.constants';

/**
 * §5.7 (создание отклика из лида): кнопка «Отклик» на экране лидов создаёт Application
 * ровно тем же путём, что ручное создание (§4.2 резолв vacancy_source/vacancy_external_id,
 * §4.4/§4.10 докачка логотипа после INSERT) — вызывает тот же ApplicationsService.create(),
 * ничего не дублируя. Признак «отклик уже создан» — вычисляемая пара
 * (vacancy_source, vacancy_external_id), колонки и внешнего ключа между таблицами
 * по-прежнему нет (§3.5). Синка после создания не выполняется — ручное создание её
 * тоже не делает.
 *
 * VacancyLeadsService и ApplicationsService импортируются как значения — этого требует
 * emitDecoratorMetadata для DI (§2.4 п.4).
 */
@Injectable()
export class VacancyLeadApplicationService {
  private readonly logger = new Logger(VacancyLeadApplicationService.name);

  constructor(
    private readonly leadsService: VacancyLeadsService,
    private readonly applicationsService: ApplicationsService,
  ) {}

  /**
   * §5.7: 404 — нет лида (findOneOrFail), 409 — отклик по паре
   * (vacancy_source, vacancy_external_id) уже существует.
   */
  async applyToLead(leadId: string): Promise<Application> {
    const lead = await this.leadsService.findOneOrFail(leadId);
    const existing = await this.applicationsService.findOneByVacancyRef({
      source: lead.source,
      externalId: lead.externalId,
    });

    if (existing !== null) {
      throw new ConflictException(LEAD_ALREADY_APPLIED_MESSAGE);
    }

    const application = await this.applicationsService.create(this.buildCreateDto(lead));

    this.logger.log(`${LEAD_APPLIED_LOG_MESSAGE}: лид ${lead.id} → отклик ${application.id}`);

    return application;
  }

  async hasApplication(lead: VacancyLead): Promise<boolean> {
    const existing = await this.applicationsService.findOneByVacancyRef({
      source: lead.source,
      externalId: lead.externalId,
    });

    return existing !== null;
  }

  /** §5.7: признак hasApplication для всего списка GET /api/vacancy-leads — один SELECT на всю таблицу откликов. */
  async findAppliedRefKeys(): Promise<ReadonlySet<string>> {
    const refs = await this.applicationsService.findAppliedVacancyRefs();

    return new Set(refs.map(serializeVacancyRefKey));
  }

  /**
   * §4.3 п.4/5: position нормализуется тем же способом, что автозаполнение из preview —
   * пустая после нормализации строка становится undefined, а не пустым company (валидация
   * CreateApplicationDto считает '' валидным только через @IsOptional + @EmptyTextToNull,
   * но здесь строка не приходит из формы, поэтому undefined безопаснее пустой строки).
   * vacancySource/vacancyExternalId НЕ передаются — их вычисляет
   * ApplicationsService.resolveVacancyRef из vacancyUrl (§4.2); status/result получают
   * дефолты в buildCreatePayload.
   */
  private buildCreateDto(lead: VacancyLead): CreateApplicationDto {
    return {
      company: lead.company,
      position: normalizeVacancyPosition(lead.position) ?? undefined,
      vacancyUrl: lead.vacancyUrl,
    };
  }
}
