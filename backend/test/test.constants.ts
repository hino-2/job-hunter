import { HttpStatus } from '@nestjs/common';
import type { NestApplicationOptions } from '@nestjs/common';

import { API_GLOBAL_PREFIX } from '../src/app.constants';
import {
  APPLICATION_COLUMN,
  APPLICATIONS_ROUTE,
  APPLICATIONS_TABLE,
} from '../src/applications/applications.constants';
import {
  DEFAULT_GETMATCH_MAX_RETRIES,
  DEFAULT_HH_MAX_RETRIES,
} from '../src/config/config.constants';
import { GETMATCH_VACANCY_PAGE_PATH } from '../src/getmatch/getmatch.constants';
import { HH_VACANCY_PAGE_PATH } from '../src/hh/hh.constants';
import { VACANCIES_ROUTE, VACANCY_PREVIEW_ROUTE } from '../src/vacancies/vacancies.constants';
import type { VacancyStubReply } from './e2e.interfaces';

/**
 * Константы e2e-окружения. Креды Basic Auth фиксированы: когда шаг 3 включит
 * глобальный guard, агент из фабрики уже будет ходить с правильными кредами
 * и спеки править не придётся.
 */
export const TEST_NODE_ENV = 'test';

export const TEST_AUTH_USER = 'e2e';
export const TEST_AUTH_PASSWORD = 'e2e-password';
export const TEST_HH_USER_AGENT = 'job-hunter-e2e/1.0';
export const TEST_GETMATCH_USER_AGENT = 'job-hunter-e2e-getmatch/1.0';

export const DEFAULT_TEST_DATABASE_HOST = '127.0.0.1';
export const DEFAULT_TEST_DATABASE_NAME = 'jobhunter_test';

/** Служебная БД, к которой подключаемся, чтобы пересоздать тестовую. */
export const MAINTENANCE_DATABASE = 'postgres';

/**
 * Имя тестовой БД подставляется в DDL интерполяцией (параметры в CREATE/DROP DATABASE
 * невозможны), поэтому оно обязано пройти этот регекс. Суффикс _test — вторая страховка
 * от того, чтобы прогон тестов не снёс рабочую базу.
 */
export const TEST_DATABASE_NAME_PATTERN = /^[a-z][a-z0-9_]*_test$/;

/**
 * Явный маркер «окружение уже подменено». Нужен потому, что Jest при maxWorkers: 1
 * выполняет globalSetup и спеки в одном процессе, поэтому setupFiles видит уже
 * переписанный POSTGRES_DB и повторная проверка «тестовая база ≠ рабочая» ложно
 * сработала бы.
 *
 * Именно флаг, а не вывод из состояния env: состояние (POSTGRES_DB === TEST_DATABASE_NAME
 * при NODE_ENV=test) может быть истинным и на ЧЕСТНОМ первом вызове — если кто-то
 * прописал в .env NODE_ENV=test и POSTGRES_DB=jobhunter_test. Тогда защита от
 * DROP DATABASE рабочей базы отключилась бы. Через process.env флаг корректно
 * наследуется и форкнутыми воркерами.
 */
export const TEST_ENV_APPLIED_FLAG = 'JOB_HUNTER_E2E_ENV_APPLIED';
export const TEST_ENV_APPLIED_VALUE = '1';

export const TRUNCATE_APPLICATIONS_QUERY = `TRUNCATE TABLE "${APPLICATIONS_TABLE}"`;

/** Прямая правка created_at — единственный способ детерминированно проверить сортировку. */
export const SET_CREATED_AT_QUERY =
  `UPDATE "${APPLICATIONS_TABLE}" SET "${APPLICATION_COLUMN.CREATED_AT}" = $1` +
  ` WHERE "${APPLICATION_COLUMN.ID}" = $2`;

/** logger: false — иначе Nest засыпает вывод Jest своими логами старта. */
export const E2E_APP_OPTIONS: NestApplicationOptions = { logger: false };

export const APPLICATIONS_ENDPOINT = `/${API_GLOBAL_PREFIX}/${APPLICATIONS_ROUTE}`;

export const DEFAULT_FIXTURE_COMPANY = 'Acme';

/** UUID правильного формата, которого заведомо нет в таблице. */
export const MISSING_UUID = '00000000-0000-4000-8000-000000000000';

export const MALFORMED_UUID = 'not-a-uuid';

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** ISO 8601 в UTC с миллисекундами — формат, который обязан отдавать API (§5). */
export const ISO_UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

/**
 * Ожидаемые тексты 400-ответов по enum'ам зашиты литералами намеренно: тест обязан
 * поймать расхождение между бэкендовым enum и его ручным дублем на фронте (§3.4).
 * Если список значений поменяется, тест упадёт и заставит обновить обе стороны.
 */
export const EXPECTED_STATUS_VALUES_MESSAGE =
  'status must be one of the following values: OPEN, CLOSED';

export const EXPECTED_RESULT_VALUES_MESSAGE =
  'result must be one of the following values: IN_PROGRESS, OFFER, REJECTED_BY_COMPANY,' +
  ' DECLINED_BY_ME, NO_RESPONSE, VACANCY_WITHDRAWN';

/** Пауза перед PATCH: updated_at пишет ORM с точностью до миллисекунды. */
export const UPDATED_AT_DELAY_MS = 25;

export const VACANCY_PREVIEW_ENDPOINT = `/${API_GLOBAL_PREFIX}/${VACANCIES_ROUTE}/${VACANCY_PREVIEW_ROUTE}`;

/**
 * Хост заглушек источников вакансий — только loopback, наружу они не смотрят.
 * Порт у каждого источника свой и фиксированный, а не «любой свободный»:
 * *_SITE_BASE_URL обязан быть известен ДО импорта app.module — ConfigModule.forRoot()
 * читает env в момент вычисления декоратора @Module, то есть на импорте файла,
 * а не на compile() тестового модуля.
 */
export const VACANCY_STUB_HOST = '127.0.0.1';
export const HH_STUB_PORT = 34599;
export const HH_STUB_BASE_URL = `http://${VACANCY_STUB_HOST}:${HH_STUB_PORT}`;
export const GETMATCH_STUB_PORT = 34600;
export const GETMATCH_STUB_BASE_URL = `http://${VACANCY_STUB_HOST}:${GETMATCH_STUB_PORT}`;

/**
 * §4.11.2: верхняя граница диапазона §8 — троттл в e2e фактически снят (иначе 58 e2e
 * с полусекундными паузами шли бы минутами), но валидацию env тесты проходят ту же,
 * что и прод. При 50 запросах в секунду интервал — 20 мс, а заглушка локальная,
 * поэтому на длительность прогона это не влияет.
 */
export const TEST_HH_MAX_REQUESTS_PER_SECOND = '50';

/**
 * §3.6/§4.11.1/§5.7: шаблон ссылки на выдачу теперь колонка
 * vacancy_search_settings.search_url_template, а не env — через
 * applyTestEnvironment() её больше не подставить. API отклоняет loopback-хост
 * намеренно (allow-list hh.ru, §4.2), поэтому будущий e2e прогона поиска обязан
 * установить это значение прямой SQL-командой (dataSource.query(UPDATE …)) на
 * строку настроек, а не через PUT.
 */
export const TEST_HH_SEARCH_URL_TEMPLATE = `${HH_STUB_BASE_URL}/search/vacancy?text={text}&page={page}`;

/** Node отдаёт имена входящих заголовков в нижнем регистре. */
export const USER_AGENT_HEADER_NAME = 'user-agent';
export const ACCEPT_HEADER_NAME = 'accept';
export const CONTENT_TYPE_HEADER_NAME = 'Content-Type';
export const HTML_CONTENT_TYPE = 'text/html; charset=utf-8';

/**
 * Ответ заглушки, пока тест не задал свой. Именно 418, а не 5xx: неожиданный
 * ответ должен сразу проваливать тест, а не уходить в ретраи (§4.6) и выглядеть
 * как медленный, но осмысленный сценарий.
 */
export const VACANCY_STUB_DEFAULT_REPLY: VacancyStubReply = { status: HttpStatus.I_AM_A_TEAPOT };

export const TEST_VACANCY_ID = '12345678';

export const TEST_VACANCY_URL = `https://hh.ru/vacancy/${TEST_VACANCY_ID}`;

export const TEST_VACANCY_PATH = `${HH_VACANCY_PAGE_PATH}/${TEST_VACANCY_ID}`;

/** §4.9: разведка снимала разметку с реального vacancy_id=35683 — тот же ID здесь. */
export const TEST_GETMATCH_VACANCY_ID = '35683';

export const TEST_GETMATCH_VACANCY_URL = `https://getmatch.ru/vacancies/${TEST_GETMATCH_VACANCY_ID}`;

export const TEST_GETMATCH_VACANCY_PATH = `${GETMATCH_VACANCY_PAGE_PATH}/${TEST_GETMATCH_VACANCY_ID}`;

/** Ссылка без распознаваемого источника (§4.2): ни hh.ru, ни getmatch.ru. */
export const UNSUPPORTED_VACANCY_URL = 'https://career.habr.com/vacancies/1000123456';

/** §4.6: одна попытка плюс два повтора. */
export const HH_EXPECTED_ATTEMPTS = DEFAULT_HH_MAX_RETRIES + 1;

export const GETMATCH_EXPECTED_ATTEMPTS = DEFAULT_GETMATCH_MAX_RETRIES + 1;

/**
 * Параметры массового прогона для e2e (§4.6). Конкурентность как в проде, а пауза
 * между стартами укорочена: проверяем логику синхронизации, а не бережное отношение
 * к чужому API — заглушки источников локальные. Значения фиксируются принудительно,
 * иначе длительность прогона зависела бы от .env разработчика.
 */
export const TEST_SYNC_CONCURRENCY = 3;
export const TEST_SYNC_MIN_DELAY_MS = 10;

/**
 * §4.7: в e2e планировщик выключен принудительно. Прогон по расписанию ходил бы
 * в базу, которую тесты пересоздают и чистят TRUNCATE между кейсами, и стучался бы
 * в заглушки источников с чужими ожиданиями ответа.
 */
export const TEST_SCHEDULED_SYNC_ENABLED = 'false';
