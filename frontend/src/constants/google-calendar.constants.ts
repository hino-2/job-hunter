/**
 * Кнопка «В Google Календарь» у дат собесов (§7.2.2). Событие создаётся ссылкой-шаблоном
 * calendar.google.com: без OAuth и без бэкенда, пользователь сам жмёт «Сохранить».
 */
export const GOOGLE_CALENDAR_TEMPLATE_URL = 'https://calendar.google.com/calendar/render';

export const GOOGLE_CALENDAR_ACTION = 'TEMPLATE';

/** Шаблон принимает время только в виде YYYYMMDDTHHmmssZ — из ISO выкидываются «-», «:» и миллисекунды. */
export const GOOGLE_CALENDAR_DATE_STRIP_PATTERN = /[-:]|\.\d{3}/g;

export const MS_PER_MINUTE = 60_000;

export const INTERVIEW_CALENDAR_EVENT = {
  hrInterviewAt: { titlePrefix: 'HR-собес', durationMinutes: 30 },
  techInterviewAt: { titlePrefix: 'Тех-собес', durationMinutes: 60 },
} as const;

export const CALENDAR_DESCRIPTION_LABELS = {
  employerContact: 'Контакт работодателя',
  interviewUrl: 'Где собес',
  notes: 'Заметки',
} as const;

/** Подставляется вместо пустого поля, чтобы шаблон описания всегда был одинаковым. */
export const CALENDAR_EMPTY_VALUE = '—';

export const ADD_TO_CALENDAR_LABEL = 'Добавить в Google Календарь';
