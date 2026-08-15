# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository.

## Source of truth

**[SPECIFICATION.md](./SPECIFICATION.md) is the project's source of truth.** Read the relevant
paragraph before any edit — code and comments cite its sections (`§4.3`, `§5.5`, …). Key ones:
§2.4 fixed technical decisions, §3 data model, §4 vacancy-source integration, §5 REST API,
§10 code conventions, §12 out of scope, §13 acceptance criteria.

**[CHANGELOG.md](./CHANGELOG.md)** holds the development history (formerly §14), numbered by
step. Steps 1–27 are done; further work is targeted edits on top of a finished application.
Every edit that changes application behaviour must add an entry there.

§12 lists what must **not** be built (cron beyond the existing scheduler, pagination, dark
theme, JWT, export, …) — do not add any of it on your own initiative.

**Agent-facing documentation is English**: this file, SPECIFICATION.md, CHANGELOG.md. README.md
stays Russian — it is written for the project owner. Code comments, log messages and error
strings stay Russian per §10.

## Development pipeline

### Step 0 — effort estimate (never skipped)

Before any task, make a **shallow** estimate: how many files and modules are touched, whether
new entities/endpoints/migrations are needed, one layer or both, whether public contracts
change (§3 data model, §5 REST API). A glance at file names plus a couple of reads — not a
full analysis. Then route:

- **Small** — edit directly, no agents. Signs: 1–2 files, one layer, no data-model or API
  contract change, no new module or migration, and the logic is obvious from code already
  read. Typical: a typo, a text or comment fix, a local fix inside one function, a constant
  update, a documentation edit.
- **Not small** — run the full agent chain. Signs: a new feature, a refactor, a migration, a
  new module or endpoint, a data-model or contract change, an edit spanning backend and
  frontend at once, non-obvious consequences for adjacent code.
- **Unsure** — treat as not small.

State the estimate to the user in one or two lines before starting.

### Agent chain (tasks that are not small)

No "small fixes on the side" — drive the work through the chain:

1. **`architect`** — always first. Reads the relevant spec sections and current code, returns a
   blueprint: files, types, data flows, module boundaries. Writes no code.
2. **`backend-developer` / `frontend-developer`** — implement strictly per the blueprint. Never
   hand backend code to the frontend agent or vice versa.
3. **`code-reviewer`** — immediately after every implementation. Hunts real bugs, §10
   violations and divergences from the blueprint; changes no code, returns a report.
4. The same developer agent fixes what the reviewer found; review again until the report is
   clean.

### Gates (both paths)

`npm run lint` / `typecheck` / `test` / `build` must pass, and a CHANGELOG.md entry must be
added when application behaviour changes. Only then — commit the step.

## Commands

Everything runs from the repo root; workspaces are `backend` and `frontend`.

```bash
npm run lint            # eslint in both workspaces (lint:fix — with autofix)
npm run typecheck       # tsc --noEmit in both
npm run test            # jest (backend, unit) + vitest (frontend)
npm run build           # build both
npm run format          # prettier --write

npm run dev:api         # backend in watch mode, http://127.0.0.1:3000/api
npm run dev:web         # vite, http://127.0.0.1:5173 (proxies /api to 3000)

npm run up / down / logs / ps   # docker compose
```

A single test:

```bash
npm run test --workspace=backend -- hh-url.parser        # by file name
npm run test --workspace=backend -- -t "test name"       # by test name
npm run test --workspace=frontend -- src/App.test.tsx
```

Backend e2e (needs Postgres up — tests run against a real DB):

```bash
docker compose up -d db
npm run test:e2e --workspace=backend
npm run test:e2e --workspace=backend -- applications     # one e2e file
```

Migrations (`synchronize` is off forever; schema changes only via migrations):

```bash
npm run migration:generate --workspace=backend -- src/database/migrations/MigrationName
npm run migration:run --workspace=backend
npm run migration:revert --workspace=backend
```

In Docker, migrations run automatically before `api` starts.

## Architecture

```
browser → web (nginx :8080) → api (NestJS :3000) → db (PostgreSQL :5432)
                                     ↓
                          public sites of hh.ru / getmatch.ru
```

Only `web` is published, and only on `127.0.0.1`. The frontend always calls the relative
`/api`: Vite proxies it in dev, nginx in Docker.

**npm workspaces monorepo** without turbo/nx: one `package-lock.json` at the root, shared
tooling (TypeScript, ESLint, Prettier) in root `devDependencies` so versions cannot drift.

### Backend (NestJS + TypeORM)

- **`app.setup.ts` (`configureApp`) is the single place the app is configured**: `/api` prefix,
  global `ValidationPipe`, `BasicAuthGuard`, `HttpExceptionFilter`. Both `main.ts` and the e2e
  factory (`test/e2e-app.factory.ts`) call it, so tests exercise production behaviour. The
  guard and filter are registered manually via `useGlobalGuards`/`useGlobalFilters`, **not**
  through `APP_GUARD`/`APP_FILTER` — that would create a second configuration site. Add global
  behaviour there.
- **Basic Auth is global** (`auth/basic-auth.guard.ts`): all of `/api/*` is closed except
  what is marked `@Public()` (`GET /api/health`). Comparison is `timingSafeEqual` over SHA-256
  digests; neither the Authorization header nor the login or password reaches the log.
- **One error format** (`common/http-exception.filter.ts`, §5.5) —
  `{ statusCode, message, error }`, stack traces only in the log.
  `@Catch()` without arguments catches everything,
  including `QueryFailedError`. The response goes out through `response.status().json()` so
  that `WWW-Authenticate` is not overwritten.
- **Env is validated at startup** (`config/environment.validation.ts`): a missing or invalid
  variable kills the process. A new env variable = a field in `EnvironmentVariables` + a
  default constant in `config/config.constants.ts` + a line in `.env.example` + a passthrough
  in `docker-compose.yml`.
- **Layers**: the controller maps an entity to a DTO (`ApplicationDto.fromEntity`) and
  translates domain outcomes into HTTP statuses; the service returns entities and speaks
  `SyncOutcome` (§4.5), because both sync and preview reuse it.
- **`hh-url.parser.ts` is a pure function, not a provider**: both `ApplicationsService` and
  `HhController` call it, it has no dependencies, and a provider would force every caller to
  import the module. The `SyncOutcome` enum lives in `applications/applications.constants.ts`
  because the dependency runs `hh → applications` (the `last_sync_outcome` column is in
  `applications`).
- **`hh-api.service.ts` throws nothing outward**: any failure (429, 5xx, timeout, broken JSON)
  becomes a `SyncOutcome`. Retries happen only on 429 and 5xx. Values that reach the DB are
  truncated to column width at parse time — otherwise an over-long value from the source would
  produce a 500 instead of a normal outcome.
- **`vacancy_external_id` is computed on the backend** on create and on **every** write of
  `vacancy_url` (including clearing it to `null`); the frontend never sends the field.
- **Route order**: `POST 'sync-open'` and `POST ':id/sync'` are declared **above** the methods
  with `:id`, otherwise Express matches `sync-open` as `:id`. Do not reorder. The same applies
  to `GET ':id/logo'`.
- **`vacancies/vacancy-sync.service.ts` is the single place holding the §4.3 rules**: it builds
  the `ApplicationSyncPatch` (which cannot contain `company` or `result`; `position` is written
  only on outcome `OK` and only as a non-empty normalized source title, truncated to column
  width by `vacancy-position.helpers.ts`) and saves the record itself through
  `Repository<Application>`. Module dependencies run
  `ApplicationsModule → VacanciesModule → { HhModule, GetmatchModule }`, never the reverse —
  otherwise a cycle and `forwardRef`. The §5.2 endpoints answer `200` on any outcome; `404`
  means only "no such record". The patch is applied to the entity before `save()`, so a failed
  `save()` rolls the entity back from a snapshot (`ApplicationSyncSnapshot`) — state that is
  not in the DB must never be returned.
- **`vacancy_source`/`vacancy_external_id` are written only as a pair and only on the
  `vacancy_url` write path** (`ApplicationsService.resolveVacancyRef`); `VacancySyncService.decide()`
  trusts the column and never parses the URL. A data migration touching either column must
  change both, and its `down()` must undo its own backfill — `GeneralizeVacancySource` did not,
  and a revert→up cycle glued a getmatch id to source `'HH'` (repaired by
  `RepairGetmatchVacancySource`).
- **Bulk run** (`common/async.helpers.ts`, `mapWithConcurrency`): the time slot is reserved
  synchronously, before `await`, otherwise all workers start at once. The helper neither
  swallows errors nor cancels the run — `syncOneSafely` catches them so one record cannot
  break the rest (§4.6); details go to the log, the outward message stays generic per §5.5.
- The entity (`application.entity.ts`) is the reference for `migration:generate`; the
  snake_case ↔ camelCase mapping is an explicit `name` on every column, with no custom
  NamingStrategy.
- **`logos/` knows nothing about `Application`** and lets no exception escape — a logo download
  failure must not change the §4.5 outcome. Host allow-lists are re-checked on every redirect
  hop (`beforeRedirect`), otherwise `maxRedirects > 0` reopens the SSRF hole.
- **`scheduler/`** registers its interval dynamically in `onApplicationBootstrap`, not with the
  `@Interval` decorator (§2.4); overlap is prevented by an in-process boolean flag cleared in
  `finally`, and the tick is invoked through `void` with a full internal `try/catch` — an
  unhandled rejection inside `setInterval` would kill the process.

### Frontend (React + MUI + Vite)

Providers live in `main.tsx` (ThemeProvider + LocalizationProvider ru with picker `localeText`

- QueryClientProvider). The only HTTP client is `api/client.ts`; the frontend stores no auth
  header — the browser supplies Basic Auth itself.

* **`App.tsx` is a shell with `Tabs`; `ApplicationsScreen` owns the applications screen's local
  state**: filters, accordion expansion, unsaved drafts and the notification. Server data lives
  only in React Query; there is no global store and no React context (§2.2). Context would be
  actively harmful here: it punches through `memo` on the accordion, so every keystroke would
  re-render the whole list. Callbacks are therefore collected into one stable object
  (`InlineEditHandlers`), and changing data reaches the accordion as **per-id slices**
  (`pendingById[id]`, `savedById[id]`).
* **Expansion state reaches the list as data, not as a callback** (`hooks/useExpandedIds.ts`):
  the hook returns `expandedIds: ReadonlySet<string>` plus a separate `actions` object whose
  identity never changes. A predicate closed over state changed the controller's identity on
  every toggle and with it `onToggle` on **every** accordion — one click re-rendered the whole
  list. Mutators must therefore keep empty deps; "is everything expanded" is computed by the
  pure `utils/expanded-ids.utils.ts`. The accordion receives the `boolean` slice
  `expandedIds.has(id)`.
* **`ApplicationFields` and `ApplicationSummaryRow` are under `memo`, details mount lazily**
  (`mountOnEnter: true` with `unmountOnExit` off, §7.2). The reason is not micro-optimization:
  `TextareaAutosize` declares a layout effect `syncHeight` with no dependency array and
  measures itself after every render, forcing a synchronous layout of the whole document, and a
  collapsed `Collapse` hides content with `visibility: hidden` rather than `display: none` — so
  collapsed records are measured too. A prop literal (an object or lambda inline in JSX) in
  these two components silently brings the lag back: `memo` works precisely because
  `mergeApplicationWithPending` returns **the same reference** when the draft is empty, and
  `savedFields`/`handlers` are stable.
* **`hooks/useInlineEdits.ts` — drafts and the saved highlight for the whole list** (§7.3).
  Rule: **a draft lives from the keystroke until the request is sent.** On send it is dropped
  and the field shows the optimistic cache value — same text, no flicker, and a late server
  response cannot overwrite what was typed. Exactly two exceptions: the draft is kept when a
  trimmed value goes into the patch (otherwise a pause after a space would eat that space and
  move the caret), and the draft of an incomplete URL is never dropped. The state lives here
  rather than in the field component because of §7.3: an accordion can be collapsed by clicking
  the header or by "Свернуть все", both paths go through the screen, so a pending edit can be
  flushed **before** collapsing. A draft inside the component would need a `useEffect` on the
  `expanded` prop, which `react-hooks/set-state-in-effect` forbids. The source of truth for
  drafts is a ref, state is only its mirror for rendering: `flush` is an event handler and must
  read current drafts, and calling `mutate` inside a functional `setState` updater is illegal
  (StrictMode runs it twice).
* **`ApplicationAccordion` merges the draft into the record once** and passes the result to
  both the summary row and the fields — that is how an edit is instantly visible in the
  collapsed header without a single extra line. The component is wrapped in `memo`.
* **`hooks/useUpdateApplication.ts` — autosave of a single field**: optimistic cache patch and
  **per-field** rollback on error. The mutation context is a snapshot of exactly the fields
  sent, not of the whole record: a whole-record rollback would revert a neighbouring field that
  was saved in parallel while this request was in flight. Invalidation happens only on a
  `status` change (it changes the filtered list and the §7.8 counter); after other fields a
  refetch is harmful, as the response would replace the whole array and flicker the field being
  edited right now. The hook draws neither the snackbar nor the highlight — it calls
  `onSaved`/`onFailed` once the cache is consistent. The callbacks live on the hook, not on the
  `mutate` call: a second `mutate` detaches the previous mutation from its `MutationObserver`,
  so the first call site's callbacks would never fire.
* **`hooks/useSyncApplication.ts` — sync of one record (§7.6)**, and the set of syncing ids
  lives **in the hook**: `isPending`/`variables` on `useMutation` describe only the last
  `mutate`, yet 🔄 can be clicked on two rows in a row — the second button would hang together
  with the first. The set is updated with functional `setState` in `onMutate`/`onSettled`, so
  pairing holds on all paths; the accordion receives a **`boolean` slice**, otherwise the whole
  set would punch through `memo` on every neighbour at every start and finish. Only sync
  columns are carried over from the response (`buildSyncEchoPatch`) — replacing the whole
  record would revert the optimistic value of a field being edited. `position` and
  `hasCompanyLogo` are among them but are carried only when `outcome === 'OK'` and only when
  non-empty/`true`. A `404` purges the record from the caches (deleted in another tab).
* **`hooks/useSyncAllOpen.ts` — bulk run (§7.7)**: the `applications[]` from the response is
  deliberately **not** merged into the cache — only prefix invalidation, because the client
  does not know whether a record belongs to other cached filter combinations or where it sorts
  there. Invalidation also runs in `onError`: the run is synchronous and may have completed in
  the DB while the response timed out. The `/sync` and `/sync-open` timeouts are raised
  per-request: the default 20 s is shorter than the normal worst case for one record (≈32 s).
* **The run summary is a separate `SyncSummaryAlert` in the page flow, not `useNotification`**:
  the latter wants one short auto-dismissing message, the summary needs an expandable list of
  problem records that lives until explicitly closed. The three outcome channels never mix: an
  unsuccessful `outcome` on HTTP 200 → snackbar with severity per §7.6; a failed request →
  error snackbar; `ERROR`/`RATE_LIMITED` inside a successful response → the summary `Alert`
  only.
* **A disabled 🔄 is wrapped in a `span` with `stopPropagation`**: MUI gives a disabled
  `IconButton` `pointer-events: none`, so a click on the spinner would fall through to the
  accordion header.
* **`utils/applications-cache.utils.ts` is the only place that knows the cache shape.** Both
  functions work by prefix filter over `APPLICATIONS_QUERY_KEY`, which covers every cached
  filter combination plus the header counter key at once. The patch returns **the same
  reference** to the array when the record is not in it, otherwise React Query marks every
  cache as changed.
* **The vacancies screen** (`VacanciesScreen`) polls run status, hides leads optimistically and
  restores a hidden lead by synchronously re-inserting the snapshot rather than invalidating: a
  PATCH usually fails on the network, so the restoring refetch would fail next and leave the
  record missing. The insert checks each cache's filter against the record's `hidden` value.
  There is exactly one `NotificationSnackbar` and it lives in the shell — MUI does not stack
  two independent snackbars.
* Knowingly invalid values (an empty required "Компания", a broken URL) are never sent to the
  server — the field shows `error` and `helperText` instead of a guaranteed 400. The client URL
  check is **laxer** than the server's `@IsUrl`, never stricter: otherwise a valid link would
  become unsavable.
* Status/result enums and length limits are duplicated by hand in the frontend `constants/`
  files (no shared package, §3.4). Gaps, flex-basis values, thresholds and timings come from
  `constants/layout.constants.ts` and `constants/query.constants.ts`; JSX contains no numeric
  size literals (§7).

### e2e infrastructure

`test/test-environment.ts` (`applyTestEnvironment`) is called **before** `AppModule` is
imported and replaces `process.env`: a separate `jobhunter_test` database (recreated from
scratch each run, its name checked by regex against the working database), fixed Basic Auth
credentials, source base URLs pointing at local stubs (`test/vacancy-stub.server.ts`), the
hh.ru throttle removed and the scheduler disabled. **No e2e test reaches the internet** — new
sync tests must use the same stub. Isolation between tests is `TRUNCATE`, hence `maxWorkers: 1`.

## Mandatory conventions (§10)

1. **Module-level constants only in `*.constants.ts`** of the corresponding module. Inline
   declaration in an implementation file is forbidden (controllers, modules, configs,
   components and `vite.config` included).
2. **Types in `*.type.ts`, interfaces in `*.interfaces.ts`** of the same module. Sole
   exception: a spec file may keep an inline mock type used only inside that spec.
3. **A blank line** after a block of variable declarations and after every closing brace of a
   block. `@stylistic/padding-line-between-statements` (`eslint.shared.mjs`) catches
   violations — Prettier never inserts blank lines.
4. **No `any`.** External data arrives as `unknown` and is narrowed by explicit predicates
   (see `toHhVacancy`, `buildErrorResponse`).
5. **Commits carry no `Co-Authored-By: Claude…` trailer** and no mention of process, limits or
   interruptions — the change itself only. Comments, error messages and logs stay **Russian**,
   like the rest of the code; a comment explains _why_, not _what_.

## Fixed decisions — do not revisit (§2.4)

- **TypeScript exactly 5.9.3**, not 7.x: `typescript-eslint` requires `<6.1.0`, `ts-jest` `<7`.
- **No `@nestjs/cli`**: build is `tsc -p tsconfig.build.json`, dev is
  `node --watch --require ts-node/register`. esbuild/swc/tsx are **not** usable — they do not
  support `emitDecoratorMetadata`, without which Nest DI and TypeORM mapping break.
- **`consistent-type-imports` is off on the backend** for the same reason: a class used only as
  a constructor parameter type must be imported as a value. On the frontend the rule is on.
- **`database/data-source.ts` exports exactly one `DataSource`** (`export default` only) —
  otherwise the TypeORM CLI fails.
- **`@stylistic/padding-line-between-statements`**, not the core ESLint rule (deprecated,
  removed in ESLint 11).
