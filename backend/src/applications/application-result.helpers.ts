import { TERMINAL_APPLICATION_RESULTS } from './applications.constants';
import type { ApplicationResult } from './applications.type';

/**
 * §3.3: результат, после которого отклик закрыт по определению (отказ компании,
 * отказался сам, вакансия снята). Единственное место, где проверяется терминальность:
 * правило «терминальный результат ⇒ status = CLOSED» применяется и на INSERT, и на PATCH,
 * поэтому список не должен разъехаться между двумя ветками.
 *
 * some, а не includes: у TERMINAL_APPLICATION_RESULTS элемент — узкий union из трёх
 * литералов, и includes не принял бы аргумент типа ApplicationResult.
 */
export function isTerminalApplicationResult(result: ApplicationResult): boolean {
  return TERMINAL_APPLICATION_RESULTS.some((terminal) => terminal === result);
}
