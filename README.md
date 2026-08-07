# Job Hunter

Персональный трекер откликов на вакансии с автообновлением статуса через публичный API hh.ru.
Запускается локально в Docker, пользователь один.

Требования и полное описание функциональности — в [SPECIFICATION.md](./SPECIFICATION.md).

---

## Быстрый старт

```bash
cp .env.example .env
# отредактируй .env: как минимум AUTH_PASSWORD, POSTGRES_PASSWORD и HH_USER_AGENT
docker compose up -d --build
```

Открой <http://127.0.0.1:8080>. Браузер спросит логин/пароль — это `AUTH_USER` / `AUTH_PASSWORD` из `.env`.

Полезное:

```bash
npm run up      # docker compose up -d --build
npm run down    # docker compose down (данные остаются в volume)
npm run logs    # docker compose logs -f
npm run ps      # статус сервисов
```

Данные живут в именованном volume `pgdata` и переживают `docker compose down`.
Удалить их можно только явно: `docker compose down -v`.

---

## Архитектура

```
браузер → web (nginx :8080) → api (NestJS :3000) → db (PostgreSQL :5432)
                ↓                      ↓
          статика React          публичный API hh.ru
```

Наружу опубликован **только** порт `web`, и только на `127.0.0.1` — приложение не видно
в локальной сети. `api` и `db` доступны лишь внутри compose-сети.

## Структура

```
job-hunter/
├─ SPECIFICATION.md      требования (источник истины)
├─ docker-compose.yml    db + api + web
├─ .env.example          шаблон конфигурации
├─ eslint.shared.mjs     общее правило пустых строк для обоих воркспейсов
├─ backend/              NestJS + TypeORM
└─ frontend/             React + MUI + Vite
```

Монорепо на **npm workspaces** — без turbo/nx/lerna. Один `package-lock.json` в корне,
общий тулинг (TypeScript, ESLint, Prettier) поднят в корневые devDependencies,
чтобы версии не разъезжались между воркспейсами.

---

## Разработка без Docker

Нужен только Postgres — его удобно поднять из compose:

```bash
docker compose up -d db
```

Порт базы публикуется на `127.0.0.1:${DATABASE_PORT_HOST:-5432}` — в локальной сети
она не видна, но доступна с хоста для e2e-тестов и TypeORM CLI.

Для запуска бэкенда вне Docker укажи в `.env` `DATABASE_HOST=127.0.0.1`. Дальше:

```bash
npm install
npm run dev:api    # http://127.0.0.1:3000/api  (watch-режим)
npm run dev:web    # http://127.0.0.1:5173      (проксирует /api на 3000)
```

Vite-сервер сам проксирует `/api` на бэкенд, поэтому фронт всегда обращается к
относительному пути `/api` — и в дев-режиме, и в Docker (там проксирует nginx).

### Проверки

```bash
npm run lint        # ESLint в обоих воркспейсах
npm run typecheck   # tsc --noEmit в обоих воркспейсах
npm run test        # jest (backend) + vitest (frontend)
npm run build       # сборка обоих воркспейсов
npm run format      # prettier --write
```

### e2e-тесты бэкенда

Нужен поднятый Postgres — тесты работают против настоящей базы, а не против мока:

```bash
docker compose up -d db
npm run test:e2e --workspace=backend
```

Тесты используют **отдельную** базу `jobhunter_test` (имя настраивается через
`TEST_DATABASE_NAME`), которая при каждом прогоне удаляется и создаётся заново,
после чего на неё накатываются миграции. Рабочая база из `POSTGRES_DB` не затрагивается:
прогон падает с ошибкой, если имя тестовой базы совпадает с рабочей или не оканчивается
на `_test`. Между тестами таблицы чистятся `TRUNCATE`, поэтому спеки идут в один поток
(`maxWorkers: 1`).

Подключение берётся из корневого `.env`: хост — `TEST_DATABASE_HOST` (по умолчанию
`127.0.0.1`), порт — `DATABASE_PORT_HOST`. Креды Basic Auth на время тестов подменяются
фиксированными значениями, поэтому в `.env` для них ничего настраивать не нужно.

Если `docker compose up -d db` падает с «port is already allocated» — порт `5432` на хосте
уже занят локально установленным Postgres. Задай в `.env` свободный порт, например
`DATABASE_PORT_HOST=55432`, и подними стек заново; тесты подхватят его автоматически.

### Миграции

Схема БД создаётся **только** миграциями, `synchronize` выключен навсегда.

```bash
# сгенерировать миграцию по изменениям в сущностях (имя обязательно)
npm run migration:generate --workspace=backend -- src/database/migrations/InitialSchema

# применить / откатить / посмотреть статус
npm run migration:run --workspace=backend
npm run migration:revert --workspace=backend
npm run migration:show --workspace=backend
```

В Docker миграции применяются автоматически при старте контейнера `api`
(`migration:run:dist` перед `node dist/main.js`) и идемпотентны.

---

## Тех. стек

| Слой     | Что используется                                                                  |
| -------- | --------------------------------------------------------------------------------- |
| Frontend | React 19, MUI 9, `@mui/x-date-pickers` 9 + dayjs, TanStack Query 5, axios, Vite 8 |
| Backend  | NestJS 11, TypeORM 1.1, PostgreSQL 16, class-validator, `@nestjs/axios`           |
| Общее    | TypeScript 5.9, ESLint 10 (flat config) + `@stylistic`, Prettier 3                |
| Тесты    | Jest 30 + ts-jest (backend), Vitest 4 + Testing Library (frontend)                |

Почему **TypeScript 5.9**, а не 7: `typescript-eslint` поддерживает `typescript <6.1.0`,
`ts-jest` — `<7`. На TS 7 проект остался бы без линтера и без тестов на бэкенде.
Ровно 5.9.3 к тому же тянет внутри себя NestJS 11, то есть это протестированная им версия.

Почему `@stylistic/padding-line-between-statements`, а не ядровое правило ESLint:
ядровое помечено deprecated с 8.53 и будет удалено в ESLint 11 (`availableUntil: 11.0.0`).
Набор опций и поведение идентичны, конфигурация — в `eslint.shared.mjs`.

Почему нет `@nestjs/cli`: он тянет ~400 dev-пакетов (webpack и прочее), а нужны от него
только `build` и `watch`. Их закрывают `tsc -p tsconfig.build.json` и
`node --watch --require ts-node/register`. `ts-node` всё равно нужен для TypeORM CLI.

---

## Конфигурация

Все переменные и их значения по умолчанию описаны в [`.env.example`](./.env.example).
Схема валидируется при старте (`backend/src/config/environment.validation.ts`):
если обязательная переменная отсутствует или значение вне допустимого диапазона,
процесс падает с понятным сообщением. В частности, **без `AUTH_PASSWORD` приложение
не стартует** — это защита от случайного запуска инстанса без авторизации.
