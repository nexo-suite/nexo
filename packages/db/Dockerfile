# syntax=docker/dockerfile:1.7
#
# Slim migration runner. tsdown bundles drizzle-orm + postgres inline into
# dist/migrate.js (see tsdown.config.ts), so the build context is just
# dist/ (which contains migrate.js + migrations/*.sql). No package.json,
# no node_modules, no pnpm deploy. Context is produced by `nexo
# prepare-contexts` with strategy='bundle'.

FROM node:24.22.1-alpine@sha256:06d7adf3e0ef61a13f1d28682726366f97a15aa1888c934d3ecec86c33918b53
WORKDIR /app

COPY dist ./dist

ENV NODE_ENV=production

CMD ["node", "dist/migrate.js"]
