FROM node:24-alpine AS builder
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/db/package.json ./packages/db/
COPY packages/logger/package.json ./packages/logger/
COPY apps/finance/package.json ./apps/finance/
RUN corepack enable && corepack prepare pnpm@11.0.8 --activate
RUN pnpm install --frozen-lockfile

COPY vite.shared.ts ./
COPY packages/db ./packages/db
COPY packages/logger ./packages/logger
COPY apps/finance ./apps/finance

ARG PUBLIC_APP_VERSION=0.0.0
RUN echo "PUBLIC_APP_VERSION=$PUBLIC_APP_VERSION" > apps/finance/.env
RUN pnpm --filter=@nexo/finance run build

FROM node:24-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.0.8 --activate
RUN addgroup -S app && adduser -S app -G app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/db/package.json ./packages/db/
COPY packages/logger/package.json ./packages/logger/
COPY apps/finance/package.json ./apps/finance/
RUN pnpm install --frozen-lockfile --prod

COPY --from=builder --chown=app:app /app/apps/finance/build ./apps/finance/build

USER app
ENV NODE_ENV=production PORT=3000
WORKDIR /app/apps/finance
EXPOSE 3000
CMD ["node", "build"]
