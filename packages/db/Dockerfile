FROM node:24-alpine AS builder
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/db/package.json ./packages/db/
RUN corepack enable && pnpm install --frozen-lockfile

COPY packages/db ./packages/db
RUN pnpm --filter=@krieger/db run db:migrate 2>/dev/null || true

FROM node:24-alpine
WORKDIR /app
COPY --from=builder /app/packages/db ./packages/db
ENV NODE_ENV=production
CMD ["node", "--experimental-strip-types", "packages/db/src/migrate.ts"]
