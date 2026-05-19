FROM node:24-alpine AS builder
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/logger/package.json ./packages/logger/
COPY apps/bot/package.json ./apps/bot/
RUN corepack enable
RUN pnpm install --frozen-lockfile

COPY packages/logger ./packages/logger
COPY apps/bot ./apps/bot
RUN pnpm --filter=@nexo/bot run build

FROM node:24-alpine
WORKDIR /app
RUN corepack enable
RUN addgroup -S app && adduser -S app -G app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/logger/package.json ./packages/logger/
COPY apps/bot/package.json ./apps/bot/
RUN pnpm install --frozen-lockfile --prod
COPY --from=builder --chown=app:app /app/packages/logger ./packages/logger
COPY --from=builder --chown=app:app /app/apps/bot/dist ./apps/bot/dist
USER app
ENV NODE_ENV=production PORT=3003
WORKDIR /app/apps/bot
EXPOSE 3003
CMD ["node", "dist/index.js"]
