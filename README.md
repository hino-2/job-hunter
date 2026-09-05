# Job Hunter

A personal tracker of submitted job applications that refreshes their status from the public
vacancy page of the source — hh.ru, getmatch.ru or it-vacancies.ru. Runs locally in Docker, for a
single user.

Features:

- applications shown as expandable accordions, not as a table;
- inline field editing with autosave — there is no «Сохранить» button;
- company and position auto-filled from a pasted vacancy link (hh.ru, getmatch.ru,
  it-vacancies.ru);
- manual status refresh — per record (🔄) and for all open records at once, across all sources;
- a scheduled background refresh of all open records, running inside the `api` process;
- «Все / Открытые / HR-собес / Тех-собес / Закрытые» filters (the two interview-stage chips list
  only records still open, §5.1), search by company/position/notes, and sorting;
- a second screen, «Вакансии»: searching for new vacancies on hh.ru and it-vacancies.ru, screening
  them by keywords and, optionally, by a local LLM in Ollama, then creating an application from a
  found lead in one click;
- local Docker deployment behind Basic Auth, sized for one user.

The requirements and the full description of the behaviour live in [spec/](./spec/), one file per
section; the index with links is [spec/README.md](./spec/README.md). Development history is in
[CHANGELOG.md](./CHANGELOG.md).

---

## Requirements

- Docker Desktop or Docker Engine with the Compose v2 plugin (the `docker compose` command).
- Node.js ≥ 22.13 — needed only for development and for the e2e tests outside Docker; running the
  application does not require it.
- Any OS with Docker; development itself was done on Windows 11.
- Optional, for AI screening only: an NVIDIA GPU exposed to Docker. Ollama also works CPU-only —
  see [Vacancy search and AI screening](#vacancy-search-and-ai-screening-ollama).

---

## Quick start

```bash
cp .env.example .env
docker compose up -d --build
```

In `.env` you should change at least:

- `AUTH_USER` / `AUTH_PASSWORD` — the Basic Auth credentials (defaults `admin` / `admin`);
- `POSTGRES_PASSWORD` — the database password;
- `HH_USER_AGENT` — hh.ru answers `400` to requests without a meaningful User-Agent, so put your
  own real contact there. `GETMATCH_USER_AGENT` and `IT_VACANCIES_USER_AGENT` need no change — both
  sources have a safe default (no `403` on an ordinary User-Agent has been observed).

> **Renamed env keys.** `HH_SYNC_CONCURRENCY` and `HH_SYNC_MIN_DELAY_MS` were renamed to
> `SYNC_CONCURRENCY` and `SYNC_MIN_DELAY_MS` — the bulk-run parameters are shared by all vacancy
> sources, not specific to hh.ru. If your `.env` still carries the old names, **move the values to
> the new keys by hand**: the old ones are no longer read and are silently replaced by the defaults
> (`3` and `200` ms). The same kind of rename without backward compatibility already happened with
> `HH_API_BASE_URL` → `HH_SITE_BASE_URL`, and with `HH_SEARCH_URL_TEMPLATE`, which is now a setting
> edited in the UI rather than an env variable.

The first run builds the images from scratch — about a minute plus the base-image download; a
repeat `docker compose up -d` with images already built takes about 15–20 seconds.

Verify the result:

```bash
docker compose ps   # three services, api is healthy
```

- <http://127.0.0.1:8080> opens and shows «Пока нет ни одной записи»;
- on the first request to `/api/*` the browser shows its native Basic Auth dialog — the credentials
  are `AUTH_USER` / `AUTH_PASSWORD` from `.env`;
- `GET /api/health` answers without authorization — the container healthcheck polls the same
  endpoint.

Handy:

```bash
npm run up      # docker compose up -d --build
npm run down    # docker compose down (data stays in the volume)
npm run logs    # docker compose logs -f
npm run ps      # service status
```

---

## Using the app

### The «Отклики» screen

- «+ Добавить» → paste a vacancy link from hh.ru, getmatch.ru or it-vacancies.ru — the company and
  position are filled in automatically, and values you already typed by hand are not overwritten.
- Fields save themselves: on blur and after a pause in typing. There is no «Сохранить» button; a
  failed autosave rolls the value back and shows a notification.
- «Статус» and «Результат» are selects in the collapsed record header, so both can be changed
  without expanding the record.
- 🔄 in the record header refreshes the status of one vacancy from its source (hh.ru, getmatch.ru
  or it-vacancies.ru — resolved automatically from the pasted link); the source is shown in the
  tooltip of the sync icon.
- «Обновить все открытые» runs the refresh over every record in status «Открыта», regardless of the
  source of each one, and reports a summary afterwards.
- «Отказ компании» in the record header sets that result in one click. There is no delete button in
  the UI.
- The results «Отказ компании», «Отказался сам» and «Вакансия снята» close the application: the
  status becomes «Закрыта» on its own, the record leaves the «Открытые» filter, the «Открытых»
  counter and the «Обновить все открытые» run. «Нет ответа» does not close it. Records created
  before this rule get their status fixed on the next save of the result.
- «Все / Открытые / HR-собес / Тех-собес / Закрытые» filters — the two interview-stage chips list
  only records still open (an open `result`, not yet a closed one) — search by company, position
  and notes, sorting by four fields.

### The «Вакансии» screen

- Pick the search source (hh.ru or it-vacancies.ru) in the first control of the filter bar, then
  «Начать поиск» to run a fresh sweep from the first page, «Продолжить» to resume from the saved
  position of the previous run, «Остановить» to stop the current one. The run is asynchronous: the
  request returns immediately and the screen polls its status every 2 s, showing progress and then
  the final summary.
- «⚙ Настройки поиска» opens a dialog with the keywords, the stop-words, one results-page link per
  search source, the two model prompts and the «Использовать ИИ-отбор» switch.
- Each found vacancy is an accordion. A click on the collapsed row opens the vacancy in a new tab;
  expansion lives on the arrow at the right. «Отклик» creates an application from the lead in one
  click, «Скрыть» removes the lead from the list, and the «Скрытые» toggle switches to the hidden
  ones, where «Вернуть» brings a lead back.

---

## Stopping, updating, data

```bash
docker compose down      # data stays in the pgdata volume
docker compose down -v   # data is deleted irreversibly
```

Updating after `git pull`:

```bash
docker compose up -d --build
```

Migrations are applied automatically when `api` starts.

Database backup and restore (substitute your own `POSTGRES_USER` and `POSTGRES_DB` from `.env`,
both default to `jobhunter`):

```bash
docker compose exec -T db pg_dump -U jobhunter jobhunter > backup.sql
docker compose exec -T db psql -U jobhunter jobhunter < backup.sql
```

---

## Architecture

```
browser → web (nginx :8080) → api (NestJS :3000) → db (PostgreSQL :5432)
                ↓                      ↓
          React static files    public vacancy pages
                                (hh.ru, getmatch.ru, it-vacancies.ru)
                                       ↓
                            ollama :11434 (optional, profile `ai`)
```

**Only** the `web` port is published, and only on `127.0.0.1` — the application is not visible on
the local network. `api`, `db` and `ollama` are reachable inside the compose network only.

## Repository layout

```
job-hunter/
├─ spec/                 requirements (source of truth), one file per section; index — spec/README.md
├─ CHANGELOG.md          development history, newest first
├─ docker-compose.yml    db + api + web (+ ollama under the `ai` profile)
├─ .env.example          configuration template
├─ eslint.shared.mjs     the shared blank-line rule for both workspaces
├─ backend/              NestJS + TypeORM
└─ frontend/             React + MUI + Vite
```

A monorepo on **npm workspaces** — no turbo/nx/lerna. One `package-lock.json` at the root, shared
tooling (TypeScript, ESLint, Prettier) hoisted into the root devDependencies so versions cannot
drift between workspaces.

---

## Development without Docker

Only Postgres is needed, and it is convenient to start it from compose:

```bash
docker compose up -d db
```

The database port is published on `127.0.0.1:${DATABASE_PORT_HOST:-5432}` — invisible on the local
network, but reachable from the host for the e2e tests and the TypeORM CLI.

To run the backend outside Docker, set `DATABASE_HOST=127.0.0.1` in `.env`. Then:

```bash
npm install
npm run dev:api    # http://127.0.0.1:3000/api  (watch mode)
npm run dev:web    # http://127.0.0.1:5173      (proxies /api to 3000)
```

The Vite server proxies `/api` to the backend itself, which is why the frontend always calls the
relative path `/api` — in dev mode and in Docker alike (nginx proxies it there).

If AI screening is enabled, also set `VACANCY_AI_BASE_URL=http://127.0.0.1:11434`: `npm run dev:api`
runs on the host and does not resolve the compose-network name `ollama`.

### Checks

```bash
npm run lint        # ESLint in both workspaces (lint:fix — with autofix)
npm run typecheck   # tsc --noEmit in both workspaces
npm run test        # jest (backend) + vitest (frontend)
npm run build       # build both workspaces
npm run format      # prettier --write
```

Part of the test suite is deferred by the project owner's decision (no new spec files are created):
unit tests for `vacancy-sync.service` (for all sources), the sync e2e tests (`POST /:id/sync`,
`POST /sync-open`) and the frontend component tests — see §13.20 of the specification and entries 6
and 15 in CHANGELOG.md.

### Backend e2e tests

A running Postgres is required — the tests work against a real database, not a mock:

```bash
docker compose up -d db
npm run test:e2e --workspace=backend
```

The tests use a **separate** database, `jobhunter_test` (configurable via `TEST_DATABASE_NAME`),
which is dropped and recreated on every run and then migrated. The working database from
`POSTGRES_DB` is never touched: the run fails if the test database name matches the working one or
does not end in `_test`. Tables are cleaned with `TRUNCATE` between tests, so the specs run in a
single thread (`maxWorkers: 1`).

The connection comes from the root `.env`: host from `TEST_DATABASE_HOST` (default `127.0.0.1`),
port from `DATABASE_PORT_HOST`. Basic Auth credentials are replaced with fixed values for the
duration of the tests, so nothing has to be configured for them in `.env`. No e2e test reaches the
internet — vacancy sources are replaced by a local stub. If the database port is taken by a locally
installed Postgres, see «Troubleshooting» below.

### Migrations

The schema is created by migrations **only**; `synchronize` is off forever.

```bash
# generate a migration from entity changes (the name is mandatory)
npm run migration:generate --workspace=backend -- src/database/migrations/InitialSchema

# apply / revert / show status
npm run migration:run --workspace=backend
npm run migration:revert --workspace=backend
npm run migration:show --workspace=backend
```

In Docker the migrations are applied automatically when the `api` container starts
(`migration:run:dist` before `node dist/main.js`) and are idempotent.

---

## Troubleshooting

- **Port `8080` is taken.** Set a free `WEB_PORT` in `.env` and bring the stack up again.
- **Port `5432` is taken** by a locally installed Postgres (on `docker compose up -d db` — "port is
  already allocated"). Set a free `DATABASE_PORT_HOST` in `.env`, e.g. `55432`, and bring the stack
  up again — the tests and the TypeORM CLI pick it up automatically.
- **`api` never becomes `healthy`.** Check `docker compose logs api`. Typical causes: an empty
  `AUTH_PASSWORD` or `HH_USER_AGENT` (a startup crash there is fail-fast by design, see §6 of the
  specification), or an unreachable `db`.
- **The browser does not ask for the password again after `AUTH_PASSWORD` changed.** Basic Auth is
  cached by the browser for the session — open a private window or restart the browser.
- **Syncing hh.ru records fails on every record.** Check `HH_USER_AGENT` in `.env` and that `hh.ru`
  is reachable from the machine running the `api` container.
- **hh.ru sync returns `403` en masse.** hh.ru blocked requests from this User-Agent or IP — change
  `HH_USER_AGENT` to a meaningful value with a real contact; retrying does not help (there are no
  retries on `403`).
- **Sync returns «страница вакансии hh.ru не распознана».** hh.ru changed the page markup (the
  expected `archived` tokens are gone) — update `hh-page.parser.ts` for the new layout. Until then
  the vacancy data is simply not refreshed; the whole application does not fall over.
- **Syncing getmatch.ru or it-vacancies.ru returns `403`.** Neither source was observed to block by
  User-Agent, but if that changed — check `GETMATCH_USER_AGENT` / `IT_VACANCIES_USER_AGENT` in
  `.env` and that the site is reachable from the machine running the `api` container; retrying does
  not help here either (no retries on `403`, same as hh.ru).
- **Sync returns «страница вакансии getmatch.ru не распознана».** getmatch.ru changed its markup or
  the format of the flight payload (`self.__next_f.push(...)`) — the `initialVacancy` key is not
  found, or the chunks do not concatenate into valid JSON. Update `getmatch-page.parser.ts` for the
  new format; the same principle as `hh-page.parser.ts` applies — the vacancy data stops updating,
  the application keeps working.
- **Sync returns «страница вакансии it-vacancies.ru не распознана».** The
  `application/ld+json` `JobPosting` block is missing from the page — update
  `it-vacancies-page.parser.ts`. Same fail-soft principle.
- **The AI screening counter `aiFallbacks` keeps growing with no other errors in the log.**
  `VACANCY_AI_TIMEOUT_MS` (default `30000`) is too low for this machine — the default is measured on
  a GPU, and on CPU-only Ollama a cold model load plus a full stage-1 batch can exceed 30 s. Raise
  the value.

If an old `.env` still has `HH_API_BASE_URL`, it can be deleted: the application uses
`HH_SITE_BASE_URL` with the default `https://hh.ru`, and the old variable is simply not read. The
same goes for `HH_SYNC_CONCURRENCY` / `HH_SYNC_MIN_DELAY_MS` (replaced by `SYNC_CONCURRENCY` /
`SYNC_MIN_DELAY_MS`, see the warning in «Quick start» above) and for `HH_SEARCH_URL_TEMPLATE` (now
edited in the «Настройки поиска» dialog). If you had tuned any of those values, move them to the new
places by hand — the old keys are silently ignored and do not break startup.

---

## Tech stack

| Layer    | What is used                                                                       |
| -------- | ---------------------------------------------------------------------------------- |
| Frontend | React 19, MUI 9, `@mui/x-date-pickers` 9 + dayjs, TanStack Query 5, axios, Vite 8  |
| Backend  | NestJS 11, TypeORM 1.1, PostgreSQL 16, class-validator, `@nestjs/axios`            |
| Shared   | TypeScript 5.9, ESLint 10 (flat config) + `@stylistic`, Prettier 3                 |
| Tests    | Jest 30 + ts-jest (backend), Vitest 4 + Testing Library (frontend)                 |
| AI       | Ollama + `qwen3:4b-instruct` (optional), or any OpenAI-compatible cloud provider   |

Why **TypeScript 5.9** and not 7: `typescript-eslint` supports `typescript <6.1.0`, `ts-jest`
supports `<7`. On TS 7 the project would be left with no linter and no backend tests. Exactly 5.9.3
is also what NestJS 11 pulls in itself, i.e. the version it has been tested against.

Why `@stylistic/padding-line-between-statements` and not the core ESLint rule: the core one has
been deprecated since 8.53 and will be removed in ESLint 11 (`availableUntil: 11.0.0`). The option
set and the behaviour are identical; the configuration is in `eslint.shared.mjs`.

Why no `@nestjs/cli`: it drags in ~400 dev packages (webpack and friends) while only `build` and
`watch` are ever needed from it. Those are covered by `tsc -p tsconfig.build.json` and
`node --watch --require ts-node/register`. `ts-node` is needed for the TypeORM CLI anyway.

---

## Configuration

Every variable and its default is described in [`.env.example`](./.env.example). The schema is
validated at startup (`backend/src/config/environment.validation.ts`): if a required variable is
missing or a value falls outside the allowed range, the process dies with a clear message. In
particular, **the application does not start without `AUTH_PASSWORD`** — a guard against
accidentally bringing up an instance with no authorization.

The vacancy-source integration variables are three symmetric groups, `HH_*`, `GETMATCH_*` and
`IT_VACANCIES_*` (base URL, User-Agent, request timeout, retry count), plus `SYNC_CONCURRENCY` /
`SYNC_MIN_DELAY_MS` shared by all sources (bulk-run concurrency and pause, §4.6 of the
specification). The only variable that is mandatory and has no default is `HH_USER_AGENT` (hh.ru
answers `400` without a meaningful User-Agent); all `GETMATCH_*` and `IT_VACANCIES_*` variables are
optional.

The application runs the same sweep as the «Обновить все открытые» button on a schedule of its own
(§4.7): `SCHEDULED_SYNC_ENABLED` (`true`/`false`, default `true`) and `SCHEDULED_SYNC_INTERVAL_MS`
(default `1800000` — 30 minutes, allowed range `60000`…`86400000`). The first sweep happens after
one interval, not at startup. To switch background requests to the vacancy sources off, set
`SCHEDULED_SYNC_ENABLED=false` and run `docker compose up -d --force-recreate api`; whether the
scheduler is running is visible in the `api` log as the line «Плановая синхронизация включена,
интервал N мин» at startup.

`docker compose` reads the variables from the root `.env` only when containers start: after editing
`.env`, apply the changes with `docker compose up -d --force-recreate api`.

Company logos (§4.10) are downloaded during sync into the `COMPANY_LOGO_DIR` directory with a
`COMPANY_LOGO_REQUEST_TIMEOUT_MS` timeout (default `5000`). In Docker that is
`/var/lib/job-hunter/logos` on the named volume `logos` — the files survive container recreation;
the default `os.tmpdir()/job-hunter-logos` targets dev mode, where the application runs directly on
the host. When changing `COMPANY_LOGO_DIR` in `.env`, change the volume mount point in
`docker-compose.yml` too.

`HH_MAX_REQUESTS_PER_SECOND` is a shared throttle for **all** hh.ru requests, not just search: the
vacancy page during sync and preview, the results page and the vacancy page during search, and the
logos from hhcdn.ru all go through the same rate limit. it-vacancies.ru has its own independent
`IT_VACANCIES_MAX_REQUESTS_PER_SECOND` — a sweep of one source must not eat the other's request
budget.

---

## Vacancy search and AI screening (Ollama)

The «Вакансии» tab (§4.11, §4.12) searches for new vacancies on hh.ru and it-vacancies.ru on a
button press and sorts them by keywords, and optionally by a local model in Ollama. The tab works
out of the box without AI: the deterministic keyword screening needs no extra container.

To enable AI screening:

```bash
docker compose --profile ai up -d ollama
docker compose exec ollama ollama pull qwen3:4b-instruct
```

Then turn «Использовать ИИ-отбор» on in the search settings dialog on the frontend — the backend
starts calling `VACANCY_AI_BASE_URL` (default `http://ollama:11434`, inside the compose network).
The model is pulled once, by hand, with the command above: auto-pulling on `api` startup is not
done, as that would be several gigabytes of traffic from an implicit command.

Details:

- the `ollama` service lives under the compose profile `ai`: without the `--profile ai` flag it does
  not come up, and the AI-less infrastructure stays exactly as it was (three services);
- the `ollama` port is published on `127.0.0.1` only (`OLLAMA_PORT_HOST`, default `11434`) — it is
  needed by dev mode and by manual `curl` diagnostics, not by the containers, which reach it by
  compose-network name;
- the `ollama` service reserves an NVIDIA GPU in `docker-compose.yml`. On a machine without the
  NVIDIA driver in Docker, **delete that `deploy:` section** — otherwise the container will not
  start; on CPU it works with no other changes, only slower;
- models survive `docker compose down` (the named volume `ollama-models`) and are lost only on
  `docker compose down -v`;
- `OLLAMA_KEEP_ALIVE=5m` unloads the model from RAM after 5 minutes of idling — a search run is
  started only manually (§4.11.10), so the model is not needed most of the time;
- `OLLAMA_NUM_PARALLEL=3` and `VACANCY_AI_CONCURRENCY=3` set how many calls hit the model at once,
  and they must be changed together. The first sets the slot count inside Ollama itself (the KV
  cache grows linearly: 448 MiB per slot measured at `n_ctx=4096`), the second sets how many
  concurrent requests the screening pipeline sends. If the second is larger, the extra requests just
  queue up inside Ollama and burn `VACANCY_AI_TIMEOUT_MS`; if it is smaller, slots that are already
  paid for sit idle. On a machine with no GPU or little VRAM set both to `1`;
- without the `ollama` container, or with AI screening off, the pipeline does not break — it
  degrades to deterministic keyword screening (`VACANCY_MATCH_MODE`), and the backend only writes a
  `warn` to the log when the model is unavailable while AI screening is on;
- switching to a cloud OpenAI-compatible provider is `VACANCY_AI_PROVIDER=openai` plus
  `VACANCY_AI_BASE_URL` / `VACANCY_AI_MODEL` / `VACANCY_AI_API_KEY`, with no `ollama` container and
  no code changes.

The remaining search variables (run budgets, screening modes) are in
[`.env.example`](./.env.example), section «Поиск, отбор и отображение вакансий с hh.ru». The
results-page links are no longer env variables — they are edited directly in the «Настройки поиска»
dialog on the frontend, one per search source, and are validated on save (`https://`, a host from
that source's allow-list, the `{page}` placeholder). The search query is part of the link itself
(your own `text=…`); there is no separate field for it.

---

## Limitations

Deliberately not implemented: queues, workers, system cron and a separate scheduler container
(scheduled sync exists, but lives inside the `api` process on `@nestjs/schedule`, see
«Configuration» above), WebSocket/SSE, notifications, export/import, mobile layout, dark theme,
multi-user support. The full list is §12 of the specification.

The company logo directory sits on the named volume `logos` and survives recreation of the `api`
container. If a file does go missing anyway (`docker compose down -v`, manual volume cleanup, a move
to another machine), the DB row stays, the record header shows the letter fallback, and the logo
comes back by itself on the next sync of that record. A record created with a vacancy link gets its
logo right away, on create; a record with no link gets one at the first sync after a link is added
(🔄, «Обновить все открытые» or the scheduled sweep). Vacancy leads selected by keywords only,
without AI, never get a logo, and no backfill is done — see §4.10 of the specification.
