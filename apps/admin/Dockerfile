FROM node:24-alpine AS builder
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/db/package.json ./packages/db/
COPY packages/email/package.json ./packages/email/
COPY packages/errors/package.json ./packages/errors/
COPY packages/i18n/package.json ./packages/i18n/
COPY packages/logger/package.json ./packages/logger/
COPY packages/security/package.json ./packages/security/
COPY packages/ui/package.json ./packages/ui/
COPY apps/admin/package.json ./apps/admin/
RUN corepack enable && corepack prepare pnpm@11.0.8 --activate
RUN pnpm install --frozen-lockfile

COPY vite.shared.ts tsconfig.json ./
COPY packages/db ./packages/db
COPY packages/email ./packages/email
COPY packages/errors ./packages/errors
COPY packages/i18n ./packages/i18n
COPY packages/logger ./packages/logger
COPY packages/security ./packages/security
COPY packages/ui ./packages/ui
COPY apps/admin ./apps/admin
RUN pnpm --filter=@nexo/admin run build

FROM node:24-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.0.8 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/db/package.json ./packages/db/
COPY packages/email/package.json ./packages/email/
COPY packages/errors/package.json ./packages/errors/
COPY packages/i18n/package.json ./packages/i18n/
COPY packages/logger/package.json ./packages/logger/
COPY packages/security/package.json ./packages/security/
COPY packages/ui/package.json ./packages/ui/
COPY apps/admin/package.json ./apps/admin/
RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/apps/admin/build ./apps/admin/build

ENV NODE_ENV=production PORT=3000
WORKDIR /app/apps/admin
EXPOSE 3000
CMD ["node", "build"]
