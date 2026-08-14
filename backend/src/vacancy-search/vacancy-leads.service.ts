import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import type { SelectQueryBuilder } from 'typeorm';

import { buildLikePattern } from '../common/like.helpers';
import type { FindVacancyLeadsQueryDto } from './dto/find-vacancy-leads.query.dto';
import { parseDedupKeyWithIdRow, serializeDedupKey } from './vacancy-lead-key.helpers';
import { VacancyLead } from './vacancy-lead.entity';
import {
  DEFAULT_VACANCY_LEADS_HIDDEN_FILTER,
  DEFAULT_VACANCY_LEADS_ORDER,
  DEFAULT_VACANCY_LEADS_SORT,
  VACANCY_LEAD_NOT_FOUND_MESSAGE,
  VACANCY_LEADS_ALIAS,
  VACANCY_LEADS_HIDDEN_EXCLUDE_CONDITION,
  VACANCY_LEADS_HIDDEN_ONLY_CONDITION,
  VACANCY_LEADS_LIST_LIMIT_ENV_KEY,
  VACANCY_LEADS_ORDER_DIRECTIONS,
  VACANCY_LEADS_SEARCH_CONDITION,
  VACANCY_LEADS_SORT_PROPERTIES,
  VACANCY_LEADS_TIEBREAK_PROPERTY,
} from './vacancy-search.constants';
import type { VacancyLeadDedupKey, VacancyLeadInsertRow } from './vacancy-search.interfaces';

/**
 * CRUD-грань vacancy_leads (§3.5, §5.7) плюс три эшелона дедупликации (§4.11.5),
 * которыми пользуется конвейер отбора (vacancy-scan.service.ts). Repository,
 * VacancyLead и ConfigService импортируются как значения — этого требует
 * emitDecoratorMetadata для DI (§2.4 п.4).
 */
@Injectable()
export class VacancyLeadsService {
  private readonly listLimit: number;

  constructor(
    @InjectRepository(VacancyLead)
    private readonly leads: Repository<VacancyLead>,
    configService: ConfigService,
  ) {
    this.listLimit = configService.getOrThrow<number>(VACANCY_LEADS_LIST_LIMIT_ENV_KEY);
  }

  findAll(query: FindVacancyLeadsQueryDto): Promise<VacancyLead[]> {
    return this.buildFindQuery(query).getMany();
  }

  async findOneOrFail(id: string): Promise<VacancyLead> {
    const entity = await this.leads.findOneBy({ id });

    if (entity === null) {
      throw new NotFoundException(VACANCY_LEAD_NOT_FOUND_MESSAGE);
    }

    return entity;
  }

  /** §5.7: PATCH идемпотентен — hidden_at не перезаписывается повторным вызовом с тем же значением. */
  async setHidden(id: string, hidden: boolean): Promise<VacancyLead> {
    const entity = await this.findOneOrFail(id);

    if (hidden && entity.hiddenAt === null) {
      entity.hiddenAt = new Date();

      return this.leads.save(entity);
    }

    if (!hidden && entity.hiddenAt !== null) {
      entity.hiddenAt = null;

      return this.leads.save(entity);
    }

    return entity;
  }

  /**
   * §4.11.5 эшелон 2: один SELECT по ключам страницы — только для вакансий, прошедших
   * ИИ по названию. Возвращает Map<сериализованный ключ, id>, а не просто Set,
   * чтобы touchLastSeen мог обновить last_seen_at найденных дубликатов без второго
   * похода в БД. keys.length ограничен размером одной страницы выдачи (≤50), поэтому
   * генерация плоского списка тройко-параметров безопасна.
   */
  async findExistingKeys(keys: readonly VacancyLeadDedupKey[]): Promise<Map<string, string>> {
    const result = new Map<string, string>();

    if (keys.length === 0) {
      return result;
    }

    const params: Record<string, string> = {};
    const tuples = keys.map((key, index) => {
      params[`ck${index}`] = key.companyKey;
      params[`pk${index}`] = key.positionKey;
      params[`po${index}`] = key.publishedOn;

      return `(:ck${index}, :pk${index}, :po${index})`;
    });

    const rows: unknown[] = await this.leads
      .createQueryBuilder(VACANCY_LEADS_ALIAS)
      .select(`${VACANCY_LEADS_ALIAS}.id`, 'id')
      .addSelect(`${VACANCY_LEADS_ALIAS}.companyKey`, 'company_key')
      .addSelect(`${VACANCY_LEADS_ALIAS}.positionKey`, 'position_key')
      .addSelect(`${VACANCY_LEADS_ALIAS}.publishedOn`, 'published_on')
      .where(
        `(${VACANCY_LEADS_ALIAS}.companyKey, ${VACANCY_LEADS_ALIAS}.positionKey, ${VACANCY_LEADS_ALIAS}.publishedOn)` +
          ` IN (${tuples.join(', ')})`,
        params,
      )
      .getRawMany();

    for (const row of rows) {
      const parsed = parseDedupKeyWithIdRow(row);

      if (parsed !== null) {
        result.set(serializeDedupKey(parsed.key), parsed.id);
      }
    }

    return result;
  }

  /** §4.11.5: дубликат не молчит — у существующей строки обновляется last_seen_at. */
  async touchLastSeen(ids: readonly string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }

    await this.leads.update({ id: In([...ids]) }, { lastSeenAt: new Date() });
  }

  /**
   * §4.11.5 эшелон 3: INSERT ... ON CONFLICT DO NOTHING — источник истины даже при
   * гонке с уникальным индексом (второй одновременный прогон исключён §4.11.10,
   * но индекс дешевле, чем доверять SELECT'у, сделанному страницу назад).
   * Возвращает true, если строка реально вставлена (а не молча отброшена конфликтом).
   *
   * result.identifiers для этого НЕ годится: TypeORM кладёт туда по одному элементу
   * на каждую переданную строку независимо от исхода — id генерируется базой, и при
   * пропуске строки через ON CONFLICT DO NOTHING клиенту просто нечем его заполнить,
   * элемент массива всё равно появляется. Единственный надёжный признак — сами строки,
   * фактически вернувшиеся через RETURNING (result.raw): пустой массив — строка не вставлена.
   */
  async insertIgnoringConflict(row: VacancyLeadInsertRow): Promise<boolean> {
    const result = await this.leads
      .createQueryBuilder()
      .insert()
      .into(VacancyLead)
      .values(row)
      .orIgnore()
      .execute();

    const raw: unknown = result.raw;

    return Array.isArray(raw) && raw.length > 0;
  }

  private buildFindQuery(query: FindVacancyLeadsQueryDto): SelectQueryBuilder<VacancyLead> {
    const builder = this.leads.createQueryBuilder(VACANCY_LEADS_ALIAS);
    const hidden = query.hidden ?? DEFAULT_VACANCY_LEADS_HIDDEN_FILTER;
    const sort = query.sort ?? DEFAULT_VACANCY_LEADS_SORT;
    const order = query.order ?? DEFAULT_VACANCY_LEADS_ORDER;

    if (hidden === 'exclude') {
      builder.andWhere(VACANCY_LEADS_HIDDEN_EXCLUDE_CONDITION);
    } else if (hidden === 'only') {
      builder.andWhere(VACANCY_LEADS_HIDDEN_ONLY_CONDITION);
    }

    if (query.search !== undefined && query.search.length > 0) {
      builder.andWhere(VACANCY_LEADS_SEARCH_CONDITION, { search: buildLikePattern(query.search) });
    }

    // ORDER BY собирается только из статических карт — пользовательский ввод сюда
    // попадает лишь как уже провалидированный @IsIn ключ.
    builder.orderBy(
      `${VACANCY_LEADS_ALIAS}.${VACANCY_LEADS_SORT_PROPERTIES[sort]}`,
      VACANCY_LEADS_ORDER_DIRECTIONS[order],
    );
    builder.addOrderBy(
      `${VACANCY_LEADS_ALIAS}.${VACANCY_LEADS_TIEBREAK_PROPERTY}`,
      VACANCY_LEADS_ORDER_DIRECTIONS.asc,
    );
    // §5.7: предохранитель, а не пагинация.
    builder.take(this.listLimit);

    return builder;
  }
}
