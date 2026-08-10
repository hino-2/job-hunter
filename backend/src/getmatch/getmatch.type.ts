import { GETMATCH_PAGE_STATE } from './getmatch.constants';
import type {
  GetmatchPageAbsent,
  GetmatchPageParsed,
  GetmatchPageUnparsable,
} from './getmatch.interfaces';

export type GetmatchPageState = (typeof GETMATCH_PAGE_STATE)[keyof typeof GETMATCH_PAGE_STATE];

/**
 * Дискриминант — state (§4.9): PARSED несёт разобранную vacancy, ABSENT и UNPARSABLE —
 * просто метки исхода разбора без дополнительных данных.
 */
export type GetmatchPageParseResult =
  GetmatchPageParsed | GetmatchPageAbsent | GetmatchPageUnparsable;
