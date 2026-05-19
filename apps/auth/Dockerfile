# syntax=docker/dockerfile:1.7
# Sharper layer caching: manifests copied before sources, so the install
# layer reuses across source-only changes. Must be updated when adding or
# removing workspace packages.
#
# apps/auth/package.json sets "files": ["build", "package.json"] so the
# adapter-node build/ output is included in `pnpm deploy` (build/ is
# .gitignored, which pnpm pack would otherwise honour).

FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/db/package.json        ./packages/db/
COPY packages/logger/package.json    ./packages/logger/
COPY packages/security/package.json  ./packages/security/
COPY packages/ui/package.json        ./packages/ui/
COPY apps/auth/package.json          ./apps/auth/

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

COPY vite.shared.ts tsconfig.json ./
COPY packages/db        ./packages/db
COPY packages/logger    ./packages/logger
COPY packages/security  ./packages/security
COPY packages/ui        ./packages/ui
COPY apps/auth          ./apps/auth

RUN pnpm --filter=@nexo/auth run build

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm --filter=@nexo/auth --prod --legacy deploy /prod/auth


FROM node:24-alpine
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app

COPY --from=build --chown=app:app /prod/auth .

USER app
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["node", "build"]
