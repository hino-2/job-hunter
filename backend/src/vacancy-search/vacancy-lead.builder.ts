import { clampText } from '../common/text.helpers';
import {
  KEYWORD_LIST_JOIN_SEPARATOR,
  VACANCY_LEAD_AI_MODEL_LENGTH,
  VACANCY_LEAD_AI_REASON_LENGTH,
  VACANCY_LEAD_AREA_NAME_LENGTH,
  VACANCY_LEAD_COMPANY_KEY_LENGTH,
  VACANCY_LEAD_COMPANY_LENGTH,
  VACANCY_LEAD_EMPLOYMENT_FORM_LENGTH,
  VACANCY_LEAD_EXPERIENCE_LENGTH,
  VACANCY_LEAD_EXTERNAL_ID_LENGTH,
  VACANCY_LEAD_POSITION_KEY_LENGTH,
  VACANCY_LEAD_POSITION_LENGTH,
  VACANCY_LEAD_SALARY_CURRENCY_LENGTH,
  VACANCY_LEAD_WORK_FORMATS_LENGTH,
} from './vacancy-search.constants';
import type { VacancyLeadInsertRow, VacancyLeadRowInput } from './vacancy-search.interfaces';

function clampOrNull(value: string | null, maxLength: number): string | null {
  return value === null ? null : clampText(value, maxLength);
}

/**
 * §4.11.4/§4.11.5: единственное место, где значения будущей строки vacancy_leads
 * режутся по ширине колонки (§10) — источник не гарантирует длину, а без
 * среза insertIgnoringConflict упал бы QueryFailedError'ом вместо штатной вставки
 * (тот же принцип, что normalizeVacancyPosition у applications, §4.3).
 *
 * source приходит из входа (источник идущего прогона), а не зашит константой: лиды
 * бывают из разных источников (§4.8).
 *
 * matchedKeywords — колонка text без предела длины (§3.5), поэтому не клампится,
 * только склеивается через запятую; пустой массив → null (колонка «нет совпавших
 * слов», а не пустая строка).
 */
export function buildVacancyLeadRow(input: VacancyLeadRowInput): VacancyLeadInsertRow {
  const { item } = input;

  return {
    source: input.source,
    externalId: clampText(item.externalId, VACANCY_LEAD_EXTERNAL_ID_LENGTH),
    position: clampText(item.position, VACANCY_LEAD_POSITION_LENGTH),
    company: clampText(item.company, VACANCY_LEAD_COMPANY_LENGTH),
    positionKey: clampText(input.positionKey, VACANCY_LEAD_POSITION_KEY_LENGTH),
    companyKey: clampText(input.companyKey, VACANCY_LEAD_COMPANY_KEY_LENGTH),
    publishedOn: input.publishedOn,
    publishedAt: new Date(item.publishedAtIso),
    vacancyUrl: item.vacancyUrl,
    areaName: clampOrNull(item.areaName, VACANCY_LEAD_AREA_NAME_LENGTH),
    salaryFrom: item.salaryFrom,
    salaryTo: item.salaryTo,
    salaryCurrency: clampOrNull(item.salaryCurrency, VACANCY_LEAD_SALARY_CURRENCY_LENGTH),
    salaryGross: item.salaryGross,
    experience: clampOrNull(item.experience, VACANCY_LEAD_EXPERIENCE_LENGTH),
    employmentForm: clampOrNull(item.employmentForm, VACANCY_LEAD_EMPLOYMENT_FORM_LENGTH),
    workFormats: clampOrNull(item.workFormats, VACANCY_LEAD_WORK_FORMATS_LENGTH),
    matchedKeywords:
      input.matchedKeywords.length > 0
        ? input.matchedKeywords.join(KEYWORD_LIST_JOIN_SEPARATOR)
        : null,
    matchSource: input.matchSource,
    aiModel: clampOrNull(input.aiModel, VACANCY_LEAD_AI_MODEL_LENGTH),
    aiTitleReason: clampOrNull(input.aiTitleReason, VACANCY_LEAD_AI_REASON_LENGTH),
    aiDescriptionReason: clampOrNull(input.aiDescriptionReason, VACANCY_LEAD_AI_REASON_LENGTH),
  };
}
