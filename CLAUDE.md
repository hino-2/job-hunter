# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository.

## Source of truth

**The specification in [`spec/`](./spec/) is the project's source of truth**, split one file per
section. [`spec/README.md`](./spec/README.md) is its index: every `§` with its file and a one-line
summary.

**Read only the file for the `§` you need — never the directory as a whole**, and never extra files
"for context". Code and comments cite sections (`§4.3`, `§5.5`, `§4.11.12`); a citation maps to
`spec/N.M-*.md`. When the right `§` is not obvious, read `spec/README.md` first and pick from the
index — do not scan the files. Key ones: §2.4 fixed technical decisions, §3 data model, §4
vacancy-source integration, §5 REST API, §10 code conventions, §12 out of scope, §13 acceptance
criteria.

Section numbering is frozen — over 1200 comments in `backend/` and `frontend/` cite it. Never
renumber; a new section takes the next free number and gets a row in `spec/README.md`. A new file
in `spec/` without a row in the index does not exist as far as the next session is concerned.

`SPECIFICATION.md` at the root is a pointer to `spec/README.md` and holds no requirements.

CHANGELOG.md was removed (formerly §14) and is no longer maintained — steps 1–27 were done there;
further work is targeted edits on top of a finished application, with no development log kept.

§12 lists what must **not** be built (cron beyond the existing scheduler, pagination, dark
theme, JWT, export, …) — do not add any of it on your own initiative.

**All documentation is English**: this file, everything under `spec/` and README.md.
Russian UI labels quoted inside those files («Обновить все открытые») and quoted error strings stay
verbatim. Code comments, log messages and error strings stay Russian per §10.

## Development pipeline

The pipeline itself — step 0 effort estimate, the `architect` →
`backend-developer`/`frontend-developer` → `backend-code-reviewer`/`frontend-code-reviewer`
chain, and the rule that a not-small task never gets a "small fix on the side" — is defined
once in the user-level `~/.claude/CLAUDE.md` and is not repeated here. Project specifics only:

- The public contracts whose change makes a task **not small** are §3 (data model) and §5
  (REST API).
- Both reviewers check §10 conventions in addition to the blueprint.
- **Gates:** `npm run lint` / `typecheck` / `test` / `build` must pass. Only then — commit the
  step.

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

Backend-specific gotchas, conventions and e2e infrastructure notes moved to
[`backend/CLAUDE.md`](./backend/CLAUDE.md) — loads only when working under `backend/`.

### Frontend (React + MUI + Vite)

Frontend-specific gotchas and hook/component conventions moved to
[`frontend/CLAUDE.md`](./frontend/CLAUDE.md) — loads only when working under `frontend/`.

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
