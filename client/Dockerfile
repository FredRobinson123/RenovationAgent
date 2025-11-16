# syntax=docker/dockerfile:1.7

FROM node:20-slim AS base
WORKDIR /app
ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY client/package.json client/package.json
RUN pnpm install --filter client... --frozen-lockfile
COPY client client
RUN pnpm --filter client... build

FROM nginx:1.27-alpine AS runtime
ENV PORT=4173
COPY --from=build /app/client/dist /usr/share/nginx/html
COPY client/nginx.conf.template /etc/nginx/templates/default.conf.template
EXPOSE 4173
CMD ["nginx", "-g", "daemon off;"]

