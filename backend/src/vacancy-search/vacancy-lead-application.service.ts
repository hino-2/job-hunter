import { ConflictException, Injectable, Logger } from '@nestjs/common';

import { VACANCY_SOURCE } from '../applications/applications.constants';
import type { Application } from '../applications/application.entity';
import { ApplicationsService } from '../applications/applications.service';
import type { CreateApplicationDto } from '../applications/dto/create-application.dto';
import { normalizeVacancyPosition } from '../vacancies/vacancy-position.helpers';
import { serializeVacancyRefKey } from './vacancy-lead-key.helpers';
import type { VacancyLeadAppliedKeys } from './vacancy-search.interfaces';
import type { VacancyLead } from './vacancy-lead.entity';
import { VacancyLeadsService } from './vacancy-leads.service';
import { LEAD_ALREADY_APPLIED_MESSAGE, LEAD_APPLIED_LOG_MESSAGE } from './vacancy-search.constants';

/**
 * §5.7 (создание отклика из лида): кнопка «Отклик» на экране лидов создаёт Application
 * ровно тем же путём, что ручное создание (§4.2 резолв vacancy_source/vacancy_external_id,
 * §4.4/§4.10 докачка логотипа после INSERT) — вызывает тот же ApplicationsService.create(),
 * ничего не дублируя. Признак «отклик уже создан» — вычисляемая пара
 * (vacancy_source, vacancy_external_id) для HH/IT_VACANCIES/GEEKJOB, либо (§4.14)
 * точное vacancy_url для COMPANY_SITE (findExistingApplication ниже) — колонки и
 * внешнего ключа между таблицами по-прежнему нет (§3.5). Синка после создания не
 * выполняется — ручное создание её тоже не делает.
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
   * §5.7: 404 — нет лида (findOneOrFail), 409 — отклик уже существует.
   *
   * §4.14: для лида COMPANY_SITE «уже существует» проверяется по vacancy_url, а не по
   * паре (vacancy_source, vacancy_external_id) — см. findExistingApplication.
   */
  async applyToLead(leadId: string): Promise<Application> {
    const lead = await this.leadsService.findOneOrFail(leadId);
    const existing = await this.findExistingApplication(lead);

    if (existing !== null) {
      throw new ConflictException(LEAD_ALREADY_APPLIED_MESSAGE);
    }

    const application = await this.applicationsService.create(this.buildCreateDto(lead));

    this.logger.log(`${LEAD_APPLIED_LOG_MESSAGE}: лид ${lead.id} → отклик ${application.id}`);

    return application;
  }

  async hasApplication(lead: VacancyLead): Promise<boolean> {
    const existing = await this.findExistingApplication(lead);

    return existing !== null;
  }

  /**
   * §5.7/§4.14: признак hasApplication для всего списка GET /api/vacancy-leads — два
   * SELECT'а на всю таблицу откликов вместо одного на лида (§4.14 добавил второй —
   * по vacancy_url, для COMPANY_SITE, где пара vacancy_source+vacancy_external_id не
   * резолвится, см. ApplicationsService.findOneByVacancyUrl).
   */
  async findAppliedKeys(): Promise<VacancyLeadAppliedKeys> {
    const [refs, urls] = await Promise.all([
      this.applicationsService.findAppliedVacancyRefs(),
      this.applicationsService.findAppliedVacancyUrls(),
    ]);

    return { refKeys: new Set(refs.map(serializeVacancyRefKey)), urls };
  }

  /**
   * §4.14: единственная точка ветвления «как искать существующий отклик» — лид
   * COMPANY_SITE резолвится ApplicationsService.resolveVacancyRef в vacancySource: null
   * (хосты сайтов компаний не входят в VacancyProviderRegistry), поэтому поиск по паре
   * (source, externalId) для него всегда возвращал бы null и позволял бы плодить
   * дубликаты откликов при повторном клике «Отклик» — vacancy_url остаётся единственным
   * устойчивым ключом.
   */
  private findExistingApplication(lead: VacancyLead): Promise<Application | null> {
    if (lead.source === VACANCY_SOURCE.COMPANY_SITE) {
      return this.applicationsService.findOneByVacancyUrl(lead.vacancyUrl);
    }

    return this.applicationsService.findOneByVacancyRef({
      source: lead.source,
      externalId: lead.externalId,
    });
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
