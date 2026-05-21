# syntax=docker/dockerfile:1.7
#
# The bot consumes @nexo/logger as a workspace symlink. Logger emits
# compiled JS to packages/logger/dist via tsc; we copy that dist/ into
# the runtime image so Node resolves the package's exports map to real
# .js files (no type-stripping under node_modules required).

FROM node:24-alpine AS fetch
WORKDIR /app
RUN corepack enable
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
# pnpm v10+ refuses to purge node_modules without a TTY unless CI=true.
ENV CI=true

COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm fetch

FROM fetch AS build
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install -r --offline --frozen-lockfile

RUN pnpm turbo run build --filter=@nexo/bot


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

# Workspace package compiled output — Node resolves @nexo/logger via the
# package.json exports map to dist/index.js.
COPY --from=build --chown=app:app /app/packages/logger/dist ./packages/logger/dist
COPY --from=build --chown=app:app /app/apps/bot/dist ./apps/bot/dist
RUN chown -R app:app /app

USER app
ENV NODE_ENV=production
ENV PORT=3003
ARG GIT_COMMIT=dev
ARG BUILD_TIME=
ENV GIT_COMMIT=$GIT_COMMIT
ENV BUILD_TIME=$BUILD_TIME
WORKDIR /app/apps/bot
EXPOSE 3003

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3003/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
