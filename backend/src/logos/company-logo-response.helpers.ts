import { NotFoundException, StreamableFile } from '@nestjs/common';

import { COMPANY_LOGO_DISPOSITION, COMPANY_LOGO_NOT_FOUND_MESSAGE } from './company-logo.constants';
import type { CompanyLogoService } from './company-logo.service';

/**
 * §4.10, §4.11, §5.1: общая отдача байтов логотипа компании — переиспользуется
 * и ApplicationsController (отклики), и VacancyLeadsController (лиды поиска, шаг №26 §14).
 * Чистая функция, а не провайдер — тот же принцип, что у hh-url.parser.ts: у неё нет
 * ни состояния, ни собственных зависимостей, а провайдер обязывал бы оба контроллера
 * тянуть за собой лишний модуль ради одного метода.
 *
 * null в fileName (у записи нет логотипа) и null из read() (файл пропал с диска —
 * штатно для эфемерного каталога) — это одна и та же ошибка для клиента, а не разные
 * ветки: наружу отдаётся один и тот же 404 с одним и тем же текстом.
 *
 * notFoundMessage — необязательный, по умолчанию COMPANY_LOGO_NOT_FOUND_MESSAGE (§4.10):
 * оба существующих вызывающих (ApplicationsController, VacancyLeadsController) продолжают
 * получать байт-в-байт тот же текст, что и раньше. SourceIconsController (§5.8) передаёт
 * свой текст явно — «Логотип компании не сохранён» вводил бы в заблуждение про иконку сайта.
 */
export async function readCompanyLogoOrFail(
  logos: CompanyLogoService,
  fileName: string | null,
  notFoundMessage: string = COMPANY_LOGO_NOT_FOUND_MESSAGE,
): Promise<StreamableFile> {
  if (fileName === null) {
    throw new NotFoundException(notFoundMessage);
  }

  const content = await logos.read(fileName);

  if (content === null) {
    throw new NotFoundException(notFoundMessage);
  }

  return new StreamableFile(content.buffer, {
    type: content.contentType,
    disposition: COMPANY_LOGO_DISPOSITION,
    length: content.length,
  });
}
