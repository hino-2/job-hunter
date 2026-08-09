import dayjs from 'dayjs';

import {
  APPLICATION_FIELD_PICKERS,
  APPLICATION_STATUS,
  EDITABLE_FIELDS,
  EDITABLE_TEXT_FIELDS,
  EMPTY_TEXT_FIELD_VALUE,
  STATUS_FILTER,
  URL_TEXT_FIELDS,
} from '../constants/application.constants';
import { UPCOMING_INTERVIEW_HIGHLIGHT_HOURS } from '../constants/layout.constants';
import type {
  Application,
  ApplicationCounts,
  ApplicationCreate,
  ApplicationsFilters,
  ApplicationUpdate,
  CreateApplicationFormValues,
  UpcomingInterview,
} from '../types/application.interfaces';
import type {
  EditableField,
  EditableTextField,
  PendingTextValues,
  UrlTextField,
} from '../types/application.type';
import { isSavableUrl } from './url.utils';

/** Счётчик шапки «Открытых: N / M» (§7.8). Передаётся в select React Query по ссылке. */
export function countApplications(items: readonly Application[]): ApplicationCounts {
  const open = items.filter((item) => item.status === APPLICATION_STATUS.OPEN).length;

  return { open, total: items.length };
}

/**
 * Ближайшее будущее собеседование из hrInterviewAt / techInterviewAt (§7.2.1, элемент 5).
 * Прошедшие и пустые даты отбрасываются: если будущих нет — ячейка шапки не рисуется.
 *
 * «Сейчас» берётся здесь, а не в JSX: React Compiler считает чтение текущего времени
 * в рендере нечистым и правила eslint-plugin-react-hooks на это ругаются.
 */
export function selectUpcomingInterview(application: Application): UpcomingInterview | null {
  const now = dayjs();
  const upcoming = [application.hrInterviewAt, application.techInterviewAt]
    .filter((value): value is string => value !== null)
    .map((value) => dayjs(value))
    .filter((value) => value.isAfter(now))
    .sort((left, right) => left.valueOf() - right.valueOf())
    .at(0);

  if (upcoming === undefined) {
    return null;
  }

  return {
    at: upcoming.toISOString(),
    isSoon: upcoming.diff(now, 'hour', true) <= UPCOMING_INTERVIEW_HIGHLIGHT_HOURS,
  };
}

/**
 * Прячет ли текущий набор фильтров часть записей. Сортировка активным фильтром не
 * считается: она меняет порядок, но ничего не убирает, — иначе пустой список после
 * простой смены сортировки предлагал бы «Сбросить фильтры» без причины.
 */
export function isFilterActive(filters: ApplicationsFilters): boolean {
  return filters.status !== STATUS_FILTER.ALL || filters.search.trim().length > 0;
}

/** Поле-ссылка: у него черновик переживает невалидное значение, у остальных — нет (§7.3). */
export function isUrlTextField(field: EditableTextField): field is UrlTextField {
  return URL_TEXT_FIELDS.some((urlField) => urlField === field);
}

/** Значение текстового поля для контролируемого input'а: null в UI показывается пустым. */
export function readTextFieldValue(application: Application, field: EditableTextField): string {
  return application[field] ?? EMPTY_TEXT_FIELD_VALUE;
}

/** Новый словарь черновиков с записанным полем: состояние мутировать нельзя. */
export function withDraft(
  values: PendingTextValues,
  field: EditableTextField,
  value: string,
): PendingTextValues {
  const next: PendingTextValues = { ...values };

  next[field] = value;

  return next;
}

/** Тот же словарь без черновика поля. Ссылка сохраняется, если черновика и не было. */
export function withoutDraft(
  values: PendingTextValues,
  field: EditableTextField,
): PendingTextValues {
  if (values[field] === undefined) {
    return values;
  }

  const next: PendingTextValues = { ...values };

  delete next[field];

  return next;
}

/**
 * Кэш React Query + черновики = то, что одновременно видят и шапка (§13.10.8), и поля.
 * Пустой черновик обязан вернуть ту же ссылку: иначе memo на аккордеоне бесполезен
 * и каждое нажатие клавиши перерисовывало бы весь список.
 */
export function mergeApplicationWithPending(
  application: Application,
  pending: PendingTextValues,
): Application {
  if (Object.keys(pending).length === 0) {
    return application;
  }

  const merged: Application = { ...application };

  for (const field of EDITABLE_TEXT_FIELDS) {
    const draft = pending[field];

    if (draft !== undefined) {
      merged[field] = draft;
    }
  }

  return merged;
}

/**
 * Черновик текстового поля → тело PATCH (§7.3: только изменённые поля). null означает
 * «отправлять нечего»: такое значение бэкенд отверг бы с 400, и вместо запроса поле
 * показывает ошибку само.
 *
 * Пустое значение очищается явным null, хотя @EmptyTextToNull привёл бы к тому же:
 * так тело запроса выражает намерение, а не полагается на трансформер.
 *
 * ВАЖНО для вызывающего: значение тримится, поэтому отправленное может отличаться
 * от набранного. Считать, что после отправки поле показывает ровно введённый текст,
 * нельзя — на этом основана логика удержания черновика в sendText.
 */
export function buildTextFieldPatch(
  field: EditableTextField,
  value: string,
): ApplicationUpdate | null {
  const trimmed = value.trim();
  const nullable = trimmed.length === 0 ? null : trimmed;

  switch (field) {
    case 'company':
      // §5.1: company обязательна (@IsNotEmpty), пустую отправлять бессмысленно.
      return nullable === null ? null : { company: nullable };
    case 'position':
      return { position: nullable };
    case 'vacancyUrl':
      return isSavableUrl(trimmed) ? { vacancyUrl: nullable } : null;
    case 'resumeUrl':
      return isSavableUrl(trimmed) ? { resumeUrl: nullable } : null;
    case 'employerContact':
      return { employerContact: nullable };
    case 'interviewUrl':
      return isSavableUrl(trimmed) ? { interviewUrl: nullable } : null;
    case 'notes':
      return { notes: nullable };
  }
}

/** Снимок для отката: значения ровно тех полей, которые уходят в патче. */
export function pickApplicationPatch(
  application: Application,
  patch: ApplicationUpdate,
): ApplicationUpdate {
  let previous: ApplicationUpdate = {};

  for (const field of EDITABLE_FIELDS) {
    if (patch[field] !== undefined) {
      previous = { ...previous, ...APPLICATION_FIELD_PICKERS[field](application) };
    }
  }

  return previous;
}

/** Какие поля подсветить как «сохранено» (§7.3). */
export function listPatchedFields(patch: ApplicationUpdate): EditableField[] {
  return EDITABLE_FIELDS.filter((field) => patch[field] !== undefined);
}

/** Патч ничего не меняет — такой PATCH не отправляем (§7.3: «только если изменилось»). */
export function isNoopPatch(application: Application, patch: ApplicationUpdate): boolean {
  return EDITABLE_FIELDS.every(
    (field) => patch[field] === undefined || patch[field] === application[field],
  );
}

/**
 * Что из ответа сервера безопасно донести в кэш поверх оптимистичного значения.
 *
 * Пользовательские поля не переносятся вовсе: они уже лежат в кэше оптимистично, а ответ
 * «догоняющего» PATCH'а мог бы затереть параллельную правку соседнего поля. Переносим
 * только вычисляемое бэкендом: hhVacancyId (пересчитывается при каждой записи vacancyUrl,
 * §4.2) и заведомо более свежий updatedAt.
 */
export function buildServerEchoPatch(
  saved: Application,
  patch: ApplicationUpdate,
  cached: Application | undefined,
): Partial<Application> {
  let echo: Partial<Application> = {};

  if (patch.vacancyUrl !== undefined) {
    echo = { ...echo, hhVacancyId: saved.hhVacancyId };
  }

  if (cached === undefined || saved.updatedAt > cached.updatedAt) {
    echo = { ...echo, updatedAt: saved.updatedAt };
  }

  return echo;
}

/**
 * Что из ответа /sync (§5.2) переносится в кэш. Ровно колонки, которыми владеет
 * синхронизация (§4.3): company/position/result/ссылки/даты/notes не переносятся вовсе —
 * ответ мог быть сформирован до того, как долетел параллельный автосейв, и затёр бы
 * оптимистичное значение поля, которое правят прямо сейчас (то же правило, что у
 * buildServerEchoPatch). hhVacancyId тоже не переносится: синхронизация его не меняет,
 * а PATCH vacancyUrl мог уже уйти вперёд.
 */
export function buildSyncEchoPatch(
  saved: Application,
  cached: Application | undefined,
): Partial<Application> {
  const patch: Partial<Application> = {
    status: saved.status,
    hhArchived: saved.hhArchived,
    hhVacancyType: saved.hhVacancyType,
    lastSyncedAt: saved.lastSyncedAt,
    lastSyncOutcome: saved.lastSyncOutcome,
    lastSyncError: saved.lastSyncError,
  };

  if (cached === undefined || saved.updatedAt > cached.updatedAt) {
    return { ...patch, updatedAt: saved.updatedAt };
  }

  return patch;
}

/**
 * Значения формы диалога создания → тело POST /api/applications (§7.4, §5.1).
 * status и серверные поля сюда никогда не попадают — форма их не показывает вовсе.
 * Опциональные текстовые поля тримятся и попадают в payload только непустыми: иначе
 * пустая строка ушла бы туда, где бэкенд ждёт либо значение, либо отсутствие поля.
 */
export function buildCreateApplicationPayload(
  values: CreateApplicationFormValues,
): ApplicationCreate {
  const payload: ApplicationCreate = {
    company: values.company.trim(),
    result: values.result,
  };

  const position = values.position.trim();

  if (position.length > 0) {
    payload.position = position;
  }

  const vacancyUrl = values.vacancyUrl.trim();

  if (vacancyUrl.length > 0) {
    payload.vacancyUrl = vacancyUrl;
  }

  const resumeUrl = values.resumeUrl.trim();

  if (resumeUrl.length > 0) {
    payload.resumeUrl = resumeUrl;
  }

  const employerContact = values.employerContact.trim();

  if (employerContact.length > 0) {
    payload.employerContact = employerContact;
  }

  if (values.hrInterviewAt !== null) {
    payload.hrInterviewAt = values.hrInterviewAt;
  }

  if (values.techInterviewAt !== null) {
    payload.techInterviewAt = values.techInterviewAt;
  }

  const notes = values.notes.trim();

  if (notes.length > 0) {
    payload.notes = notes;
  }

  return payload;
}
