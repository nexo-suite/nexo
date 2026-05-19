# syntax=docker/dockerfile:1.7
# Sharper layer caching: manifests copied before sources, so the install
# layer reuses across source-only changes. Must be updated when adding or
# removing workspace packages.
#
# apps/finance/package.json sets "files": ["build", "package.json"] so the
# adapter-node build/ output is included in `pnpm deploy` (build/ is
# .gitignored, which pnpm pack would otherwise honour).

FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/db/package.json        ./packages/db/
COPY packages/errors/package.json    ./packages/errors/
COPY packages/i18n/package.json      ./packages/i18n/
COPY packages/logger/package.json    ./packages/logger/
COPY packages/security/package.json  ./packages/security/
COPY packages/ui/package.json        ./packages/ui/
COPY apps/finance/package.json       ./apps/finance/

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

COPY vite.shared.ts tsconfig.json ./
COPY packages/db        ./packages/db
COPY packages/errors    ./packages/errors
COPY packages/i18n      ./packages/i18n
COPY packages/logger    ./packages/logger
COPY packages/security  ./packages/security
COPY packages/ui        ./packages/ui
COPY apps/finance       ./apps/finance

RUN pnpm --filter=@nexo/finance run build

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm --filter=@nexo/finance --prod --legacy deploy /prod/finance


FROM node:24-alpine
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app

COPY --from=build --chown=app:app /prod/finance .

USER app
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["node", "build"]
