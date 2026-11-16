# syntax=docker/dockerfile:1.7
#
# Slim migration runner. tsdown bundles drizzle-orm + postgres inline into
# dist/migrate.js (see tsdown.config.ts), so the build context is just
# dist/ (which contains migrate.js + migrations/*.sql). No package.json,
# no node_modules, no pnpm deploy. Context is produced by `nexo
# prepare-contexts` with strategy='bundle'.

FROM node:24.22.3-alpine@sha256:116b800c3754b440ee0aa3ed2f20f5bf3d99a554bfd9adeea09ea8017f6e85f5
WORKDIR /app

COPY dist ./dist

ENV NODE_ENV=production

CMD ["node", "dist/migrate.js"]
