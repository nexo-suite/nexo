FROM node:24-alpine AS builder
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/db/package.json ./packages/db/
COPY packages/ui/package.json ./packages/ui/
COPY apps/landing/package.json ./apps/landing/
RUN corepack enable && corepack prepare pnpm@11.0.8 --activate
RUN pnpm install --frozen-lockfile

COPY vite.shared.ts tsconfig.json ./
COPY packages/db ./packages/db
COPY packages/ui ./packages/ui
COPY apps/landing ./apps/landing

ARG PUBLIC_FINANCE_URL=https://finance.krieger2501.de
ARG PUBLIC_ADMIN_URL=https://admin.krieger2501.de
ARG PUBLIC_AUTH_URL=https://auth.krieger2501.de
ARG PUBLIC_LANDING_URL=https://krieger2501.de
ARG PUBLIC_APP_VERSION=0.0.0
RUN printf "PUBLIC_FINANCE_URL=%s\nPUBLIC_ADMIN_URL=%s\nPUBLIC_AUTH_URL=%s\nPUBLIC_LANDING_URL=%s\nPUBLIC_APP_VERSION=%s\n" \
    "$PUBLIC_FINANCE_URL" "$PUBLIC_ADMIN_URL" "$PUBLIC_AUTH_URL" "$PUBLIC_LANDING_URL" "$PUBLIC_APP_VERSION" > apps/landing/.env
RUN pnpm --filter=@nexo/landing run build

FROM node:24-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.0.8 --activate
RUN addgroup -S app && adduser -S app -G app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/db/package.json ./packages/db/
COPY packages/ui/package.json ./packages/ui/
COPY apps/landing/package.json ./apps/landing/
RUN pnpm install --frozen-lockfile --prod

COPY --from=builder --chown=app:app /app/apps/landing/build ./apps/landing/build

USER app
ENV NODE_ENV=production PORT=3000
WORKDIR /app/apps/landing
EXPOSE 3000
CMD ["node", "build"]
