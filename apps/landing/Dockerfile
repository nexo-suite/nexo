# syntax=docker/dockerfile:1.7
# Sharper layer caching: manifests copied before sources, so the install
# layer reuses across source-only changes. Must be updated when adding or
# removing workspace packages.
#
# apps/landing/package.json sets "files": ["build", "package.json"] so the
# adapter-node build/ output is included in `pnpm deploy` (build/ is
# .gitignored, which pnpm pack would otherwise honour).
#
# Build-time PUBLIC_* args are written to apps/landing/.env so $env/static
# usages get resolved at build time. Runtime envs in docker-compose still
# apply for $env/dynamic usages.

FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/db/package.json        ./packages/db/
COPY packages/security/package.json  ./packages/security/
COPY packages/ui/package.json        ./packages/ui/
COPY apps/landing/package.json       ./apps/landing/

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

COPY vite.shared.ts tsconfig.json ./
COPY packages/db        ./packages/db
COPY packages/security  ./packages/security
COPY packages/ui        ./packages/ui
COPY apps/landing       ./apps/landing

ARG PUBLIC_FINANCE_URL=https://finance.krieger2501.de
ARG PUBLIC_ADMIN_URL=https://admin.krieger2501.de
ARG PUBLIC_AUTH_URL=https://auth.krieger2501.de
ARG PUBLIC_LANDING_URL=https://krieger2501.de
RUN printf "PUBLIC_FINANCE_URL=%s\nPUBLIC_ADMIN_URL=%s\nPUBLIC_AUTH_URL=%s\nPUBLIC_LANDING_URL=%s\n" \
    "$PUBLIC_FINANCE_URL" "$PUBLIC_ADMIN_URL" "$PUBLIC_AUTH_URL" "$PUBLIC_LANDING_URL" > apps/landing/.env

RUN pnpm --filter=@nexo/landing run build

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
