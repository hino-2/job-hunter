# Директива `# syntax=` намеренно не используется: она заставляет BuildKit тянуть
# frontend-образ из docker.io на каждой сборке, и в сети без доступа к auth.docker.io
# сборка падает. Встроенного frontend'а хватает — экзотического синтаксиса здесь нет.
# Контекст сборки — корень монорепо (см. docker-compose.yml).

# --- Стадия 1: зависимости (включая dev — нужен tsc) ---
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci --workspace=backend --include-workspace-root

# --- Стадия 2: сборка TypeScript ---
FROM deps AS build
WORKDIR /app
COPY backend/tsconfig.json backend/tsconfig.build.json backend/
COPY backend/src backend/src
RUN npm run build --workspace=backend

# --- Стадия 3: рантайм (только прод-зависимости) ---
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
# Без --include-workspace-root: корневые devDependencies (typescript, eslint, ts-node)
# в рантайме не нужны и иначе просачиваются в образ даже при --omit=dev.
RUN npm ci --omit=dev --workspace=backend \
  && npm cache clean --force

COPY --from=build /app/backend/dist backend/dist

# §4.10: каталог логотипов компаний — точка монтирования именованного тома. Создаётся
# в образе и передаётся пользователю node ДО USER node: свежий том наследует владельца
# и права каталога из образа, а без этого шага Docker создал бы его root:root, и процесс
# под node не смог бы туда писать — логотипы молча перестали бы скачиваться.
RUN mkdir -p /var/lib/job-hunter/logos && chown -R node:node /var/lib/job-hunter

WORKDIR /app/backend
USER node
EXPOSE 3000

# Миграции применяются перед стартом и идемпотентны:
# при отсутствии новых TypeORM сообщает "No migrations are pending".
CMD ["sh", "-c", "npm run migration:run:dist && node dist/main.js"]
