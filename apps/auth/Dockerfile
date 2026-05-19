FROM node:24-alpine AS builder
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/db/package.json ./packages/db/
COPY packages/logger/package.json ./packages/logger/
COPY packages/security/package.json ./packages/security/
COPY packages/ui/package.json ./packages/ui/
COPY apps/auth/package.json ./apps/auth/
RUN corepack enable && corepack prepare pnpm@11.0.8 --activate
RUN pnpm install --frozen-lockfile

COPY vite.shared.ts tsconfig.json ./
COPY packages/db ./packages/db
COPY packages/logger ./packages/logger
COPY packages/security ./packages/security
COPY packages/ui ./packages/ui
COPY apps/auth ./apps/auth
RUN pnpm --filter=@nexo/auth run build

FROM node:24-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.0.8 --activate
RUN addgroup -S app && adduser -S app -G app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/db/package.json ./packages/db/
COPY packages/logger/package.json ./packages/logger/
COPY packages/security/package.json ./packages/security/
COPY packages/ui/package.json ./packages/ui/
COPY apps/auth/package.json ./apps/auth/
RUN pnpm install --frozen-lockfile --prod

COPY --from=builder --chown=app:app /app/apps/auth/build ./apps/auth/build

USER app
ENV NODE_ENV=production PORT=3000
WORKDIR /app/apps/auth
EXPOSE 3000
CMD ["node", "build"]
