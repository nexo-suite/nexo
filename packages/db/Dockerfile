# syntax=docker/dockerfile:1.7
#
# Thin migration runner. Build context is produced by `nexo prepare-contexts`,
# which runs `pnpm --prod --legacy deploy @nexo/db`. The deployed context
# contains dist/src/migrate.js and dist/migrations/*.sql (copied during the
# package's build step).

FROM node:24-alpine
WORKDIR /app

COPY . .

ENV NODE_ENV=production

CMD ["node", "dist/src/migrate.js"]
