# syntax=docker/dockerfile:1.7
#
# apps/finance/package.json sets "files": ["build", "package.json"] so the
# adapter-node build/ output is included in `pnpm deploy` (build/ is
# .gitignored, which pnpm pack would otherwise honour).

# ---------- fetch stage ----------
# Populates the virtual store from the lockfile alone — no per-package COPY
# ladder needed. Cached as long as pnpm-lock.yaml is unchanged.
FROM node:24-alpine AS fetch
WORKDIR /app
RUN corepack enable
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm fetch

# ---------- build stage ----------
FROM fetch AS build
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install -r --offline --frozen-lockfile

RUN pnpm --filter=@nexo/finance run build

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm --filter=@nexo/finance --prod --legacy deploy /prod/finance


# ---------- runtime stage ----------
FROM node:24-alpine
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app

COPY --from=build --chown=app:app /prod/finance .

USER app
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "build"]
