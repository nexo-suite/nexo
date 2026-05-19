# syntax=docker/dockerfile:1.7
#
# Migration runner — uses pnpm fetch + offline install so a workspace
# package add/remove doesn't require updating this file.

FROM node:24-alpine
WORKDIR /app
RUN corepack enable
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm fetch

COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install -r --offline --frozen-lockfile

ENV NODE_ENV=production
CMD ["node", "--experimental-strip-types", "packages/db/src/migrate.ts"]
