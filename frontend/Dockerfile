# Директива `# syntax=` намеренно не используется — см. комментарий в backend/Dockerfile.
# Контекст сборки — корень монорепо (см. docker-compose.yml).

# --- Стадия 1: сборка статики ---
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci --workspace=frontend --include-workspace-root

COPY frontend/ frontend/
RUN npm run build --workspace=frontend

# --- Стадия 2: раздача статики + прокси на API ---
FROM nginx:alpine AS runtime
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
