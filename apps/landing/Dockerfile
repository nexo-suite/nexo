# syntax=docker/dockerfile:1.7
#
# apps/landing/package.json sets "files": ["build", "package.json"] so the
# adapter-node build/ output is included in `pnpm deploy` (build/ is
# .gitignored, which pnpm pack would otherwise honour).
#
# Build-time PUBLIC_* args are written to apps/landing/.env so $env/static
# usages get resolved at build time. Runtime envs in docker-compose still
# apply for $env/dynamic usages.

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
