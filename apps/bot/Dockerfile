# syntax=docker/dockerfile:1.7
#
# The bot can't use `pnpm deploy` like the SvelteKit apps: tsc emits raw
# `import { ... } from '@nexo/logger'` and Node 24 refuses to strip types
# from any path under node_modules. `pnpm deploy` materializes workspace
# packages into node_modules, so we instead keep them as a symlink to
# /app/packages/logger (outside node_modules) via a regular `pnpm install`.

FROM node:24-alpine AS fetch
WORKDIR /app
RUN corepack enable
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm fetch

FROM fetch AS build
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install -r --offline --frozen-lockfile

RUN pnpm --filter=@nexo/bot run build


FROM fetch
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app

# Production-only install: still needs the lockfile + manifests, which the
# fetch stage already brought in. Add the bot + logger manifests, then
# offline-install only their prod deps.
COPY apps/bot/package.json ./apps/bot/
COPY packages/logger/package.json ./packages/logger/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install -r --offline --frozen-lockfile --prod \
      --filter=@nexo/bot --filter=@nexo/logger

# Workspace package source — must stay outside node_modules so Node can
# strip types from /app/packages/logger/src/index.ts.
COPY --from=build --chown=app:app /app/packages/logger/src ./packages/logger/src
COPY --from=build --chown=app:app /app/apps/bot/dist ./apps/bot/dist
RUN chown -R app:app /app

USER app
ENV NODE_ENV=production
ENV PORT=3003
WORKDIR /app/apps/bot
EXPOSE 3003

CMD ["node", "dist/index.js"]
