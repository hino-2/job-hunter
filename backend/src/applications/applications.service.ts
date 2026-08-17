import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import type { SelectQueryBuilder } from 'typeorm';

import { buildLikePattern } from '../common/like.helpers';
import { VacancyLogoService } from '../vacancies/vacancy-logo.service';
import { VacancyProviderRegistry } from '../vacancies/vacancy-provider.registry';
import type { VacancyRef } from '../vacancies/vacancies.interfaces';
import { Application } from './application.entity';
import { isTerminalApplicationResult } from './application-result.helpers';
import {
  APPLICATION_NOT_FOUND_MESSAGE,
  APPLICATION_ORDER_DIRECTIONS,
  APPLICATION_RESULT,
  APPLICATION_RESULT_CONDITION,
  APPLICATION_SEARCH_CONDITION,
  APPLICATION_SORT_NULLS,
  APPLICATION_SORT_PROPERTIES,
  APPLICATION_STATUS,
  APPLICATION_STATUS_CONDITION,
  APPLICATION_TIEBREAK_PROPERTY,
  APPLICATIONS_ALIAS,
  DEFAULT_APPLICATION_ORDER,
  DEFAULT_APPLICATION_RESULT,
  DEFAULT_APPLICATION_SORT,
  DEFAULT_APPLICATION_STATUS,
  INVALID_DATE_MESSAGE,
} from './applications.constants';
import type { ApplicationDerivedFields } from './applications.interfaces';
import type { ApplicationCreatePayload, ApplicationPatch } from './applications.type';
import type { CreateApplicationDto } from './dto/create-application.dto';
import type { FindApplicationsQueryDto } from './dto/find-applications.query.dto';
import type { UpdateApplicationDto } from './dto/update-application.dto';

/**
 * Формат уже проверен валидацией DTO; проверка на Invalid Date — защита в глубину.
 * Без неё непарсящаяся строка ушла бы в драйвер как «0NaN-NaN-NaN…» и превратилась
 * в QueryFailedError → 500, тогда как §5.6 требует 400.
 */
function toDateOrNull(value: string | null | undefined): Date | null {
  if (value === null || value === undefined) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(INVALID_DATE_MESSAGE);
  }

  return date;
}

/**
 * CRUD над applications. Возвращает сущности, а не DTO: в маппинг их превращает
 * контроллер, а сервис переиспользует правила синхронизации (vacancy-sync.service.ts).
 *
 * Repository, Application, VacancyProviderRegistry и VacancyLogoService импортируются
 * как значения — этого требует emitDecoratorMetadata для DI (§2.4 п.4).
 */
@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);

  constructor(
    @InjectRepository(Application)
    private readonly applications: Repository<Application>,
    private readonly registry: VacancyProviderRegistry,
    private readonly vacancyLogos: VacancyLogoService,
  ) {}

  /**
   * §4.2: источник и внешний ID вычисляются вместе, при каждой записи vacancy_url,
   * перебором всех провайдеров через реестр (единственная точка диспетчеризации,
   * §3 блюпринта — вторая «чистая» точка разбора URL рядом с реестром гарантированно
   * разошлась бы с ним).
   */
  private resolveVacancyRef(vacancyUrl: string | null | undefined): ApplicationDerivedFields {
    const resolution = this.registry.resolveByUrl(vacancyUrl);

    if (resolution === null) {
      return { vacancySource: null, vacancyExternalId: null };
    }

    return { vacancySource: resolution.ref.source, vacancyExternalId: resolution.ref.externalId };
  }

  findAll(query: FindApplicationsQueryDto): Promise<Application[]> {
    return this.buildFindQuery(query).getMany();
  }

  async findOneOrFail(id: string): Promise<Application> {
    const entity = await this.applications.findOneBy({ id });

    if (entity === null) {
      throw new NotFoundException(APPLICATION_NOT_FOUND_MESSAGE);
    }

    return entity;
  }

  /** §5.7: пара (vacancy_source, vacancy_external_id) → уже созданный отклик или null, не бросает. */
  findOneByVacancyRef(ref: VacancyRef): Promise<Application | null> {
    return this.applications.findOneBy({
      vacancySource: ref.source,
      vacancyExternalId: ref.externalId,
    });
  }

  /**
   * §5.7: все пары (vacancy_source, vacancy_external_id) уже созданных откликов — питает
   * признак hasApplication в списке лидов (VacancyLeadApplicationService.findAppliedRefKeys).
   *
   * Выборка без параметров, а не tuple-IN по конкретным ключам лидов страницы: таблица
   * откликов — сотни строк (§1.2), а лидов на экране может быть до VACANCY_LEADS_LIST_LIMIT
   * (по умолчанию 500) — цельный SELECT дешевле, чем IN с полутысячей троек параметров.
   *
   * filter типы не сузит (`vacancySource`/`vacancyExternalId` остаются `VacancySource | null`
   * и `string | null` в типе Application), поэтому сборка VacancyRef[] — обычный цикл
   * с явной проверкой на null, а не `any` (§10 п.4).
   */
  async findAppliedVacancyRefs(): Promise<VacancyRef[]> {
    const rows = await this.applications.find({
      select: { vacancySource: true, vacancyExternalId: true },
      where: { vacancySource: Not(IsNull()), vacancyExternalId: Not(IsNull()) },
    });
    const refs: VacancyRef[] = [];

    for (const row of rows) {
      if (row.vacancySource !== null && row.vacancyExternalId !== null) {
        refs.push({ source: row.vacancySource, externalId: row.vacancyExternalId });
      }
    }

    return refs;
  }

  async create(dto: CreateApplicationDto): Promise<Application> {
    const entity = this.applications.create(this.buildCreatePayload(dto));
    const saved = await this.applications.save(entity);

    this.logger.log(`Создана запись ${saved.id} (${saved.company})`);

    // §4.4/§4.10: докачка логотипа возможна только после INSERT — fileKey логотипа
    // это id уже существующей записи. Ждём результат: ответ POST обязан отдавать
    // актуальный hasCompanyLogo. Метод не бросает и sync-колонок не трогает.
    await this.vacancyLogos.downloadOnCreate(saved);

    // Перечитываем: колонки, которые мы не писали (last_sync_*), иначе остались бы
    // undefined; этот же перечит поднимает company_logo_file, записанный выше.
    return this.findOneOrFail(saved.id);
  }

  async update(id: string, dto: UpdateApplicationDto): Promise<Application> {
    const entity = await this.findOneOrFail(id);

    Object.assign(entity, this.buildUpdatePatch(dto));
    await this.applications.save(entity);

    return this.findOneOrFail(id);
  }

  async remove(id: string): Promise<void> {
    const result = await this.applications.delete(id);

    if ((result.affected ?? 0) === 0) {
      throw new NotFoundException(APPLICATION_NOT_FOUND_MESSAGE);
    }

    this.logger.log(`Удалена запись ${id}`);
  }

  private buildFindQuery(query: FindApplicationsQueryDto): SelectQueryBuilder<Application> {
    const builder = this.applications.createQueryBuilder(APPLICATIONS_ALIAS);
    const sort = query.sort ?? DEFAULT_APPLICATION_SORT;
    const order = query.order ?? DEFAULT_APPLICATION_ORDER;

    if (query.status !== undefined && query.status !== APPLICATION_STATUS.OPEN) {
      builder.andWhere(APPLICATION_STATUS_CONDITION, { status: query.status });
    }

    if (query.status !== undefined && query.status === APPLICATION_STATUS.OPEN) {
      builder.andWhere(APPLICATION_STATUS_CONDITION, {
        status: APPLICATION_STATUS.OPEN,
      });
      builder.andWhere('result IN (:...results)', {
        results: [APPLICATION_RESULT.IN_PROGRESS, APPLICATION_RESULT.OFFER],
      });
    }

    if (query.status !== undefined && query.status === APPLICATION_STATUS.CLOSED) {
      builder.orWhere(APPLICATION_STATUS_CONDITION, {
        status: APPLICATION_STATUS.CLOSED,
      });
      builder.orWhere('result IN (:...results)', {
        results: [
          APPLICATION_RESULT.DECLINED_BY_ME,
          APPLICATION_RESULT.REJECTED_BY_COMPANY,
          APPLICATION_RESULT.NO_RESPONSE,
          APPLICATION_RESULT.VACANCY_WITHDRAWN,
        ],
      });
    }

    if (query.result !== undefined) {
      builder.andWhere(APPLICATION_RESULT_CONDITION, { result: query.result });
    }

    if (query.search !== undefined && query.search.length > 0) {
      builder.andWhere(APPLICATION_SEARCH_CONDITION, {
        search: buildLikePattern(query.search),
      });
    }

    // ORDER BY собирается только из статических карт — пользовательский ввод
    // сюда попадает лишь как уже провалидированный @IsIn ключ.
    builder.orderBy(
      `${APPLICATIONS_ALIAS}.${APPLICATION_SORT_PROPERTIES[sort]}`,
      APPLICATION_ORDER_DIRECTIONS[order],
      APPLICATION_SORT_NULLS[sort],
    );
    builder.addOrderBy(
      `${APPLICATIONS_ALIAS}.${APPLICATION_TIEBREAK_PROPERTY}`,
      APPLICATION_ORDER_DIRECTIONS.asc,
    );

    return builder;
  }

  /**
   * Полный набор полей для INSERT. Дефолты подставляем в коде, а не полагаемся
   * на DEFAULT в БД: иначе после save() свойства остались бы undefined.
   */
  private buildCreatePayload(dto: CreateApplicationDto): ApplicationCreatePayload {
    const result = dto.result ?? DEFAULT_APPLICATION_RESULT;
    // §3.3: терминальный результат закрывает отклик сразу на создании — даже если
    // в теле пришёл status: OPEN. Правило одно на оба пути записи (см. buildUpdatePatch).
    const status = isTerminalApplicationResult(result)
      ? APPLICATION_STATUS.CLOSED
      : (dto.status ?? DEFAULT_APPLICATION_STATUS);

    return {
      company: dto.company,
      position: dto.position ?? null,
      vacancyUrl: dto.vacancyUrl ?? null,
      ...this.resolveVacancyRef(dto.vacancyUrl),
      resumeUrl: dto.resumeUrl ?? null,
      interviewUrl: dto.interviewUrl ?? null,
      status,
      result,
      employerContact: dto.employerContact ?? null,
      hrInterviewAt: toDateOrNull(dto.hrInterviewAt),
      techInterviewAt: toDateOrNull(dto.techInterviewAt),
      notes: dto.notes ?? null,
    };
  }

  /**
   * Патч для UPDATE: ключ попадает в него только если поле реально пришло в теле.
   * JSON не умеет undefined, поэтому «ключа нет» ⇒ undefined ⇒ поле не трогаем,
   * а явный null ⇒ пишем null в колонку.
   */
  private buildUpdatePatch(dto: UpdateApplicationDto): ApplicationPatch {
    const patch: ApplicationPatch = {};

    if (dto.company !== undefined) {
      patch.company = dto.company;
    }

    if (dto.position !== undefined) {
      patch.position = dto.position;
    }

    // §4.2: источник и внешний ID пересчитываются при КАЖДОЙ записи vacancy_url,
    // в том числе при его очистке (null → null) и при замене ссылки на постороннюю.
    if (dto.vacancyUrl !== undefined) {
      patch.vacancyUrl = dto.vacancyUrl;
      Object.assign(patch, this.resolveVacancyRef(dto.vacancyUrl));
    }

    if (dto.resumeUrl !== undefined) {
      patch.resumeUrl = dto.resumeUrl;
    }

    if (dto.interviewUrl !== undefined) {
      patch.interviewUrl = dto.interviewUrl;
    }

    if (dto.status !== undefined) {
      patch.status = dto.status;
    }

    // §3.3: блок обязан стоять НИЖЕ status — терминальный результат закрывает отклик
    // и перебивает status из тела запроса, а не наоборот. Обратный порядок дал бы
    // «Отказ компании» со статусом «Открыта», если клиент прислал оба поля разом.
    if (dto.result !== undefined) {
      patch.result = dto.result;

      if (isTerminalApplicationResult(dto.result)) {
        patch.status = APPLICATION_STATUS.CLOSED;
      }
    }

    if (dto.employerContact !== undefined) {
      patch.employerContact = dto.employerContact;
    }

    if (dto.hrInterviewAt !== undefined) {
      patch.hrInterviewAt = toDateOrNull(dto.hrInterviewAt);
    }

    if (dto.techInterviewAt !== undefined) {
      patch.techInterviewAt = toDateOrNull(dto.techInterviewAt);
    }

    if (dto.notes !== undefined) {
      patch.notes = dto.notes;
    }

    return patch;
  }
}
