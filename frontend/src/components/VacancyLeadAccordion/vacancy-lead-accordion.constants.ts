import type { AccordionProps } from '@mui/material';

/**
 * Своя копия ACCORDION_SLOT_PROPS (ApplicationAccordion), а не общий импорт: модуль
 * лидов не должен зависеть от модуля откликов ради одной константы (§10 — независимость
 * модулей). Смысл значений тот же (§7.2/§7.9.1): mountOnEnter/unmountOnExit: false.
 */
export const ACCORDION_SLOT_PROPS: AccordionProps['slotProps'] = {
  transition: { mountOnEnter: true, unmountOnExit: false },
};

/** Параметры window.open для клика по шапке (§7.9.1) — те же гарантии, что rel="noopener noreferrer". */
export const EXTERNAL_WINDOW_TARGET = '_blank';
export const EXTERNAL_WINDOW_FEATURES = 'noopener,noreferrer';
