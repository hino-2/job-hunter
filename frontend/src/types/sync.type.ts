import type { SyncOutcome } from './application.type';

/** §5.2: все пять ключей §4.5 присутствуют всегда, в том числе с нулями. */
export type SyncOutcomeCounts = Record<SyncOutcome, number>;
