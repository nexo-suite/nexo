FROM node:24-alpine AS builder
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/db/package.json ./packages/db/
COPY apps/auth/package.json ./apps/auth/
RUN corepack enable && pnpm install --frozen-lockfile

COPY packages/db ./packages/db
COPY apps/auth ./apps/auth
RUN pnpm --filter=@krieger/auth run build

FROM node:24-alpine
WORKDIR /app
COPY --from=builder /app/apps/auth/build ./build
COPY --from=builder /app/apps/auth/package.json ./
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
CMD ["node", "build"]
