import type { INTERVIEW_CALENDAR_EVENT } from '../constants/google-calendar.constants';

/** Поле даты собеса, для которого строится событие календаря (§7.2.2). */
export type InterviewDateField = keyof typeof INTERVIEW_CALENDAR_EVENT;
