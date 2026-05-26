# syntax=docker/dockerfile:1.7
#
# Slim runtime image. tsdown bundles every runtime dep inline (see
# tsdown.config.ts), so the build context is just dist/. No package.json,
# no node_modules, no pnpm deploy. Context is produced by `nexo
# prepare-contexts` with strategy='bundle'.

FROM node:24.15.0-alpine@sha256:d1b3b4da11eefd5941e7f0b9cf17783fc99d9c6fc34884a665f40a06dbdfc94f
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app

COPY --chown=app:app dist ./dist

USER app
ENV NODE_ENV=production
ENV PORT=3003

ARG GIT_COMMIT=dev
ARG BUILD_TIME=
ENV GIT_COMMIT=$GIT_COMMIT
ENV BUILD_TIME=$BUILD_TIME

EXPOSE 3003

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3003/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.mjs"]
