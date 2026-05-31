# syntax=docker/dockerfile:1.7
#
# Slim migration runner. tsdown bundles drizzle-orm + postgres inline into
# dist/migrate.js (see tsdown.config.ts), so the build context is just
# dist/ (which contains migrate.js + migrations/*.sql). No package.json,
# no node_modules, no pnpm deploy. Context is produced by `nexo
# prepare-contexts` with strategy='bundle'.

FROM node:24.16.0-alpine@sha256:2bdb65ed1dab192432bc31c95f94155ca5ad7fc1392fb7eb7526ab682fa5bf14
WORKDIR /app

COPY dist ./dist

ENV NODE_ENV=production

CMD ["node", "dist/migrate.js"]
