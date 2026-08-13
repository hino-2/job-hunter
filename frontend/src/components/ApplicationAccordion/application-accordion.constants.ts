import type { AccordionProps } from '@mui/material';

/**
 * Пара опций перехода Accordion обязательна целиком (§7.2/§7.3):
 * - `unmountOnExit: false` — не терять фокус и несохранённый ввод при сворачивании;
 * - `mountOnEnter: true` — ни разу не раскрытая запись не монтирует блок полей вовсе,
 *   иначе N смонтированных скрытых TextareaAutosize мерили бы себя при каждом рендере списка.
 * `unmountOnExit: true` сломал бы §7.2, поэтому размонтирование остаётся выключенным навсегда.
 * Тип берётся у самого MUI, чтобы не появилось any (§10 п.4).
 */
export const ACCORDION_SLOT_PROPS: AccordionProps['slotProps'] = {
  transition: { mountOnEnter: true, unmountOnExit: false },
};
