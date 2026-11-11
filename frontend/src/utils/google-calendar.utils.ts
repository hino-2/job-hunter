import {
  CALENDAR_DESCRIPTION_LABELS,
  CALENDAR_EMPTY_VALUE,
  GOOGLE_CALENDAR_ACTION,
  GOOGLE_CALENDAR_DATE_STRIP_PATTERN,
  GOOGLE_CALENDAR_TEMPLATE_URL,
  INTERVIEW_CALENDAR_EVENT,
  MS_PER_MINUTE,
} from '../constants/google-calendar.constants';
import type { Application } from '../types/application.interfaces';
import type { InterviewDateField } from '../types/google-calendar.type';

function toCalendarDate(ms: number): string {
  return new Date(ms).toISOString().replace(GOOGLE_CALENDAR_DATE_STRIP_PATTERN, '');
}

function describeField(
  field: keyof typeof CALENDAR_DESCRIPTION_LABELS,
  value: string | null,
): string {
  const text = value?.trim() || CALENDAR_EMPTY_VALUE;

  return `${CALENDAR_DESCRIPTION_LABELS[field]}: ${text}`;
}

/**
 * Ссылка-шаблон Google Календаря для собеса (§7.2.2) или null, если дата не задана.
 * Время уходит в UTC с суффиксом Z — календарь сам переведёт его в зону пользователя.
 * Напоминание шаблон задать не умеет: действует умолчание календаря.
 */
export function buildInterviewCalendarUrl(
  application: Application,
  field: InterviewDateField,
): string | null {
  const iso = application[field];

  if (iso === null) {
    return null;
  }

  const { titlePrefix, durationMinutes } = INTERVIEW_CALENDAR_EVENT[field];
  const start = Date.parse(iso);
  const end = start + durationMinutes * MS_PER_MINUTE;
  const details = [
    describeField('employerContact', application.employerContact),
    describeField('interviewUrl', application.interviewUrl),
    describeField('notes', application.notes),
  ].join('\n');
  const params = new URLSearchParams({
    action: GOOGLE_CALENDAR_ACTION,
    text: `${titlePrefix} ${application.company.trim()}`,
    dates: `${toCalendarDate(start)}/${toCalendarDate(end)}`,
    details,
  });

  return `${GOOGLE_CALENDAR_TEMPLATE_URL}?${params.toString()}`;
}
