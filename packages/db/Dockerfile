FROM node:24-alpine
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/db/package.json ./packages/db/
RUN corepack enable && corepack prepare pnpm@10.33.3 --activate
RUN pnpm install --frozen-lockfile

COPY packages/db ./packages/db

ENV NODE_ENV=production
CMD ["node", "--experimental-strip-types", "packages/db/src/migrate.ts"]
