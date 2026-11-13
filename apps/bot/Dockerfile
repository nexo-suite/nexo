# syntax=docker/dockerfile:1.7
#
# Slim runtime image. tsdown bundles every runtime dep inline (see
# tsdown.config.ts), so the build context is just dist/. No package.json,
# no node_modules, no pnpm deploy. Context is produced by `nexo
# prepare-contexts` with strategy='bundle'.

FROM node:24.22.2-alpine@sha256:a34ab6d7f6f4813f4d0c5469d74685604b962fbdbf5793a7bc7b4998ecb867c8
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
