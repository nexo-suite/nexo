# syntax=docker/dockerfile:1.7
#
# Slim migration runner. tsdown bundles drizzle-orm + postgres inline into
# dist/migrate.js (see tsdown.config.ts), so the build context is just
# dist/ (which contains migrate.js + migrations/*.sql). No package.json,
# no node_modules, no pnpm deploy. Context is produced by `nexo
# prepare-contexts` with strategy='bundle'.

FROM node:24.15.0-alpine@sha256:d1b3b4da11eefd5941e7f0b9cf17783fc99d9c6fc34884a665f40a06dbdfc94f
WORKDIR /app

COPY dist ./dist

ENV NODE_ENV=production

CMD ["node", "dist/migrate.js"]
