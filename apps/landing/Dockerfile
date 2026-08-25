# syntax=docker/dockerfile:1.7@sha256:a57df69d0ea827fb7266491f2813635de6f17269be881f696fbfdf2d83dda33e
#
# Thin runtime image. Build context is produced by `nexo prepare-contexts`,
# which runs `pnpm --prod deploy` for this app — so the context
# already contains package.json, node_modules, and the build/ output.
#
# All PUBLIC_* values are read via $env/dynamic/public at runtime, so the
# same image works for prod and preview — the deploy supplies URLs via
# compose env.

FROM node:24.15.0-alpine@sha256:d1b3b4da11eefd5941e7f0b9cf17783fc99d9c6fc34884a665f40a06dbdfc94f
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
