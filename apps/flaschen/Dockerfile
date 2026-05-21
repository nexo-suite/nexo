# syntax=docker/dockerfile:1.7
#
# apps/flaschen/package.json sets "files": ["build", "package.json"] so the
# adapter-node build/ output is included in `pnpm deploy` (build/ is
# .gitignored, which pnpm pack would otherwise honour). The same image runs
# the SvelteKit server (`node build`) and the worker
# (`node build/worker/index.js`) — see docker-compose.yml.

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
    pnpm install -r --prefer-offline --frozen-lockfile

ARG GIT_COMMIT=dev
ENV GIT_COMMIT=$GIT_COMMIT
RUN pnpm turbo run build --filter=@nexo/flaschen

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm --filter=@nexo/flaschen --prod --legacy deploy /prod/flaschen


FROM node:24-alpine
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app

COPY --from=build --chown=app:app /prod/flaschen .

USER app
ENV NODE_ENV=production
ENV PORT=3000
ARG GIT_COMMIT=dev
ARG BUILD_TIME=
ENV GIT_COMMIT=$GIT_COMMIT
ENV BUILD_TIME=$BUILD_TIME
EXPOSE 3000

CMD ["node", "build"]
