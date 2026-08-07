import { SetMetadata } from '@nestjs/common';
import type { CustomDecorator } from '@nestjs/common';

import { IS_PUBLIC_ROUTE_METADATA_KEY } from './auth.constants';

/**
 * Снимает Basic Auth с хендлера. Единственный такой маршрут — GET /api/health (§5.4):
 * его опрашивает healthcheck контейнера, у которого кред нет.
 *
 * Публичность помечается метаданными, а не сравнением request.url внутри guard'а:
 * сравнение пути ломается о глобальный префикс, замыкающие слэши, регистр и query-строку.
 */
export function Public(): CustomDecorator<string> {
  return SetMetadata(IS_PUBLIC_ROUTE_METADATA_KEY, true);
}
