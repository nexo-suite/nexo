FROM node:24-alpine AS builder
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/db/package.json ./packages/db/
COPY packages/email/package.json ./packages/email/
COPY apps/admin/package.json ./apps/admin/
RUN corepack enable && corepack prepare pnpm@11.0.8 --activate
RUN pnpm install --frozen-lockfile

COPY vite.shared.ts ./
COPY packages/db ./packages/db
COPY packages/email ./packages/email
COPY apps/admin ./apps/admin
RUN pnpm --filter=@nexo/admin run build

FROM node:24-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.0.8 --activate
RUN addgroup -S app && adduser -S app -G app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/db/package.json ./packages/db/
COPY packages/email/package.json ./packages/email/
COPY apps/admin/package.json ./apps/admin/
RUN pnpm install --frozen-lockfile --prod

COPY --from=builder --chown=app:app /app/apps/admin/build ./apps/admin/build

USER app
ENV NODE_ENV=production PORT=3000
WORKDIR /app/apps/admin
EXPOSE 3000
CMD ["node", "build"]
