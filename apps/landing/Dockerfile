# syntax=docker/dockerfile:1.7
#
# apps/landing/package.json sets "files": ["build", "package.json"] so the
# adapter-node build/ output is included in `pnpm deploy` (build/ is
# .gitignored, which pnpm pack would otherwise honour).
#
# All PUBLIC_* values are read via $env/dynamic/public at runtime, so the
# same image works for prod and preview — the deploy supplies URLs via
# compose env.

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

ARG GIT_COMMIT=dev
ENV GIT_COMMIT=$GIT_COMMIT
RUN pnpm turbo run build --filter=@nexo/landing

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm --filter=@nexo/landing --prod --legacy deploy /prod/landing


FROM node:24-alpine
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app

COPY --from=build --chown=app:app /prod/landing .

USER app
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "build"]
