# syntax=docker/dockerfile:1.7
#
# Slim migration runner. tsdown bundles drizzle-orm + postgres inline into
# dist/migrate.js (see tsdown.config.ts), so the build context is just
# dist/ (which contains migrate.js + migrations/*.sql). No package.json,
# no node_modules, no pnpm deploy. Context is produced by `nexo
# prepare-contexts` with strategy='bundle'.

FROM node:24.22.2-alpine@sha256:a34ab6d7f6f4813f4d0c5469d74685604b962fbdbf5793a7bc7b4998ecb867c8
WORKDIR /app

COPY dist ./dist

ENV NODE_ENV=production

CMD ["node", "dist/migrate.js"]
