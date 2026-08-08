# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Источник истины

**[SPECIFICATION.md](./SPECIFICATION.md) — источник истины проекта.** Читай релевантный
параграф перед любой правкой: код и комментарии в нём ссылаются на разделы (`§4.3`, `§5.5`, …).
Ключевые разделы: §2.4 зафиксированные тех. решения, §3 модель данных, §4 интеграция с hh.ru,
§5 REST API, §10 код-конвенции, §12 вне скоупа, §14 порядок разработки с отметками о готовности.

Порядок разработки (§14) идёт шагами; шаги 1–6 сделаны, следующий — **шаг 7: каркас фронтенда**
(тема, `layout.constants.ts`, axios-клиент, React Query, `AppHeader`, `FilterBar`, список
аккордеонов с read-only шапками, §7.2.1). Дальше 8–10 — тоже фронтенд. §12 перечисляет то, что
делать **нельзя** (cron, пагинация, тёмная тема, JWT, экспорт и т. д.) — не добавляй это
по своей инициативе.

## Команды

Всё запускается из корня; воркспейсы — `backend` и `frontend`.

```bash
npm run lint            # eslint в обоих воркспейсах (lint:fix — с автоправкой)
npm run typecheck       # tsc --noEmit в обоих
npm run test            # jest (backend, unit) + vitest (frontend)
npm run build           # сборка обоих
npm run format          # prettier --write

npm run dev:api         # backend в watch-режиме, http://127.0.0.1:3000/api
npm run dev:web         # vite, http://127.0.0.1:5173 (проксирует /api на 3000)

npm run up / down / logs / ps   # docker compose
```

Один тест:

```bash
npm run test --workspace=backend -- hh-url.parser        # по имени файла
npm run test --workspace=backend -- -t "имя теста"       # по названию
npm run test --workspace=frontend -- src/App.test.tsx
```

e2e бэкенда (нужен поднятый Postgres — тесты идут против настоящей БД):

```bash
docker compose up -d db
npm run test:e2e --workspace=backend
npm run test:e2e --workspace=backend -- applications     # один e2e-файл
```

Миграции (`synchronize` выключен навсегда, схема — только миграциями):

```bash
npm run migration:generate --workspace=backend -- src/database/migrations/ИмяМиграции
npm run migration:run --workspace=backend
npm run migration:revert --workspace=backend
```

В Docker миграции накатываются автоматически перед стартом `api`.

## Архитектура

```
браузер → web (nginx :8080) → api (NestJS :3000) → db (PostgreSQL :5432)
                                     ↓
                            публичный API hh.ru
```

Наружу опубликован только `web`, и только на `127.0.0.1`. Фронт всегда ходит на относительный
`/api`: в дев-режиме проксирует Vite, в Docker — nginx.

**Монорепо на npm workspaces** без turbo/nx: один `package-lock.json` в корне, общий тулинг
(TypeScript, ESLint, Prettier) — в корневых `devDependencies`, чтобы версии не разъезжались.

### Backend (NestJS + TypeORM)

- **`app.setup.ts` (`configureApp`) — единственное место настройки приложения**: префикс `/api`,
  глобальный `ValidationPipe`, `BasicAuthGuard`, `HttpExceptionFilter`. Его зовут и `main.ts`,
  и e2e-фабрика (`test/e2e-app.factory.ts`), поэтому тесты гоняют ровно прод-поведение.
  Guard и filter регистрируются вручную через `useGlobalGuards`/`useGlobalFilters`, а **не** через
  `APP_GUARD`/`APP_FILTER` — иначе появилось бы второе место настройки. Добавляешь глобальное
  поведение — добавляй туда.
- **Basic Auth глобальный** (`auth/basic-auth.guard.ts`): закрыт весь `/api/*`, кроме помеченного
  `@Public()` (`GET /api/health`). Сравнение — `timingSafeEqual` по SHA-256-дайджестам; в лог
  не попадают ни заголовок Authorization, ни логин, ни пароль.
- **Формат ошибок единый** (`common/http-exception.filter.ts`, §5.5): `{ statusCode, message, error }`,
  стек — только в лог. `@Catch()` без аргументов ловит всё, включая `QueryFailedError`.
  Ответ отправляется через `response.status().json()`, чтобы не затереть `WWW-Authenticate`.
- **Валидация env при старте** (`config/environment.validation.ts`): отсутствующая или невалидная
  переменная роняет процесс. Новая env-переменная = поле в `EnvironmentVariables` + дефолт-константа
  в `config/config.constants.ts` + строка в `.env.example` + проброс в `docker-compose.yml`.
- **Слои**: контроллер маппит сущность в DTO (`ApplicationDto.fromEntity`) и переводит доменные
  исходы в HTTP-статусы; сервис возвращает сущности и говорит на языке `SyncOutcome` (§4.5),
  потому что его переиспользует и синхронизация, и preview.
- **`hh-url.parser.ts` — чистая функция, а не провайдер**: её зовёт и `ApplicationsService`,
  и `HhController`, зависимостей у неё нет, а провайдер обязывал бы каждого вызывающего тянуть
  за собой модуль. Enum `SyncOutcome` объявлен в `applications/applications.constants.ts`,
  потому что зависимость идёт `hh → applications` (колонка `last_sync_outcome` — в `applications`).
- **`hh-api.service.ts` исключений наружу не бросает**: любой сбой (429, 5xx, таймаут, битый JSON)
  превращается в исход `SyncOutcome`. Ретраи — только на 429 и 5xx. Значения, попадающие в БД
  (`type.id` → `hh_vacancy_type`), режутся по ширине колонки прямо в `toHhVacancy`: иначе слишком
  длинное значение от hh.ru дало бы 500 вместо штатного исхода.
- **`hh_vacancy_id` вычисляется на бэкенде** при создании и при **каждой** записи `vacancy_url`
  (включая очистку в `null`); фронт это поле не присылает.
- **Порядок маршрутов**: `POST 'sync-open'` и `POST ':id/sync'` объявлены **выше** методов
  с `:id`, иначе Express сматчит `sync-open` как `:id`. Не переставлять.
- **`hh-sync.service.ts` — единственное место правил §4.3**: собирает `ApplicationSyncPatch`
  (в нём нет и не может быть `company`/`position`/`result`) и сам сохраняет запись через
  `Repository<Application>`. Зависимость модулей идёт `ApplicationsModule → HhModule`,
  обратного импорта нет — иначе цикл и `forwardRef`. Эндпоинты §5.2 отвечают `200` на любой
  исход; `404` — только «нет записи в БД». Патч применяется к сущности до `save()`, поэтому
  на упавшем `save()` сущность откатывается по снимку (`ApplicationSyncSnapshot`) — в ответ
  не должно уехать состояние, которого в БД нет.
- **Массовый прогон** (`common/async.helpers.ts`, `mapWithConcurrency`): слот времени
  резервируется синхронно, до `await`, иначе все воркеры стартуют одновременно. Хелпер ошибки
  не глушит и прогон не отменяет — их ловит `syncOneSafely`, чтобы одна запись не срывала
  остальные (§4.6); подробности сбоя уходят в лог, наружу — обобщённый текст, как в §5.5.
- Сущность (`application.entity.ts`) — эталон для `migration:generate`; маппинг snake_case ↔ camelCase
  задаётся явным `name` в каждой колонке, кастомной NamingStrategy нет.

### Frontend (React + MUI + Vite)

Каркас: `main.tsx` (ThemeProvider + LocalizationProvider ru + QueryClientProvider), `App.tsx`
(заглушка, проверяет `/api/health`). Единственный HTTP-клиент — `api/client.ts`; заголовков
авторизации фронт не хранит, Basic Auth подставляет сам браузер. Enum-ы статуса/результата
дублируются вручную в `constants/`-файлах фронта (общий shared-пакет заводить не нужно).
Значения зазоров, flex-basis и порогов берутся из `constants/layout.constants.ts`, не хардкодятся в JSX.

### e2e-инфраструктура

`test/test-environment.ts` (`applyTestEnvironment`) вызывается **до** импорта `AppModule` и
подменяет `process.env`: отдельная БД `jobhunter_test` (пересоздаётся с нуля каждый прогон,
имя проверяется регексом и на несовпадение с рабочей базой), фиксированные креды Basic Auth
и `HH_API_BASE_URL` на локальную заглушку (`test/hh-stub.server.ts`). **Ни один e2e не ходит
в интернет** — новые тесты синхронизации обязаны использовать эту же заглушку. Изоляция между
тестами — `TRUNCATE`, поэтому `maxWorkers: 1`.

## Обязательные конвенции (§10)

1. **Константы уровня модуля — только в `*.constants.ts`** соответствующего модуля. Инлайн-объявление
   в имплементационном файле запрещено (включая контроллеры, модули, конфиги, компоненты, vite.config).
2. **Типы — в `*.type.ts`, интерфейсы — в `*.interfaces.ts`** того же модуля. Единственное исключение:
   в spec-файле допустим инлайновый тип мока, используемого только внутри этого spec.
3. **Пустая строка** после блока объявлений переменных и после каждой закрывающей скобки блока.
   Правило `@stylistic/padding-line-between-statements` (`eslint.shared.mjs`) поймает нарушение —
   Prettier пустые строки не расставляет.
4. **Никаких `any`.** Внешние данные приходят как `unknown` и сужаются явными предикатами
   (см. `toHhVacancy`, `buildErrorResponse`).
5. **Коммиты без trailer `Co-Authored-By: Claude…`** и без упоминаний процесса, лимитов и перерывов —
   только суть изменения. Комментарии, сообщения об ошибках и логи — на русском, как в остальном коде;
   комментарий объясняет _почему_, а не _что_.

## Зафиксированные решения — не пересматривать (§2.4)

- **TypeScript ровно 5.9.3**, не 7.x: `typescript-eslint` требует `<6.1.0`, `ts-jest` — `<7`.
- **Нет `@nestjs/cli`**: сборка — `tsc -p tsconfig.build.json`, дев — `node --watch --require ts-node/register`.
  esbuild/swc/tsx использовать **нельзя** — они не поддерживают `emitDecoratorMetadata`, без которой
  ломается DI в Nest и маппинг в TypeORM.
- **`consistent-type-imports` выключен на бэкенде** по той же причине: класс, используемый только как
  тип параметра конструктора, обязан импортироваться как значение. На фронте правило включено.
- **`database/data-source.ts` экспортирует ровно один `DataSource`** (только `export default`) —
  иначе TypeORM CLI падает.
- **`@stylistic/padding-line-between-statements`**, а не ядровое правило ESLint (deprecated, удаляется в ESLint 11).
