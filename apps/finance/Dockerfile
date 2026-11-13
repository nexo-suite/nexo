# syntax=docker/dockerfile:1.7
#
# Thin runtime image. Build context is produced by `nexo prepare-contexts`,
# which runs `pnpm --prod deploy` for this app — so the context
# already contains package.json, node_modules, and the build/ output.

FROM node:24.22.2-alpine@sha256:a34ab6d7f6f4813f4d0c5469d74685604b962fbdbf5793a7bc7b4998ecb867c8
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app

COPY --chown=app:app package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --chown=app:app node_modules ./node_modules

COPY --chown=app:app build ./build

USER app
ENV NODE_ENV=production
ENV PORT=3000

ARG GIT_COMMIT=dev
ARG BUILD_TIME=
ENV GIT_COMMIT=$GIT_COMMIT
ENV BUILD_TIME=$BUILD_TIME

EXPOSE 3000
CMD ["node", "build"]
