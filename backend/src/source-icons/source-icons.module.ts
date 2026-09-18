import { Module } from '@nestjs/common';

import { LogosModule } from '../logos/logos.module';
import { SourceIconsController } from './source-icons.controller';
import { SourceIconService } from './source-icon.service';

/**
 * Модуль иконок источников вакансий (§5.8). Импортирует LogosModule ради
 * CompanyLogoService/HttpModule (§4.10) — своего HTTP-клиента и своего каталога на диске
 * у него нет. Ни сущности, ни репозитория, ни миграции: fileName живёт только в памяти
 * процесса (SourceIconService) и на файловой системе (LogosModule).
 */
@Module({
  imports: [LogosModule],
  controllers: [SourceIconsController],
  providers: [SourceIconService],
})
export class SourceIconsModule {}
