FROM node:24-alpine AS builder
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/bot/package.json ./apps/bot/
RUN corepack enable && pnpm install --frozen-lockfile

COPY apps/bot ./apps/bot
RUN pnpm --filter=@nexo/bot run build

FROM node:24-alpine
WORKDIR /app
COPY --from=builder /app/apps/bot/dist ./dist
COPY --from=builder /app/apps/bot/package.json ./
ENV NODE_ENV=production PORT=3003
EXPOSE 3003
CMD ["node", "dist/index.js"]
