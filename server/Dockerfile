# syntax=docker/dockerfile:1.7

FROM node:20-slim AS base
WORKDIR /app
ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY server/package.json server/package.json
RUN pnpm install --filter server... --frozen-lockfile
COPY server/tsconfig.json server/tsconfig.json
COPY server/src server/src
RUN pnpm --filter server... build

FROM base AS prod-deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY server/package.json server/package.json
RUN pnpm install --filter server... --prod --frozen-lockfile

FROM node:20-slim AS runtime
WORKDIR /app/server
ENV NODE_ENV=production
ENV PORT=5001
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=prod-deps /app/server/node_modules ./node_modules
COPY --from=build /app/server/dist ./dist
COPY server/package.json ./package.json
EXPOSE 5001
CMD ["node", "dist/index.js"]

