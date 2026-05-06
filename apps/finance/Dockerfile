FROM node:24-alpine AS builder
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/db/package.json ./packages/db/
COPY apps/finance/package.json ./apps/finance/
RUN corepack enable && pnpm install --frozen-lockfile

COPY vite.shared.ts ./
COPY packages/db ./packages/db
COPY apps/finance ./apps/finance

ARG PUBLIC_APP_VERSION=dev
ARG PUBLIC_AUTH_URL=https://auth.krieger2501.de
ENV PUBLIC_APP_VERSION=$PUBLIC_APP_VERSION
ENV PUBLIC_AUTH_URL=$PUBLIC_AUTH_URL
RUN pnpm --filter=@nexo/finance run build

FROM node:24-alpine
WORKDIR /app
COPY --from=builder /app/apps/finance/build ./build
COPY --from=builder /app/apps/finance/package.json ./
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
CMD ["node", "build"]
