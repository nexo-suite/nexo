# syntax=docker/dockerfile:1.7
#
# Thin runtime image. Build context is produced by `nexo prepare-contexts`,
# which runs `pnpm --prod deploy` for this app — so the context
# already contains package.json, node_modules, and the build/ output. The
# same image runs the SvelteKit server (`node build`) and the worker
# (`node build/worker/index.js`) — see docker-compose.yml.

FROM node:24.22.1-alpine@sha256:06d7adf3e0ef61a13f1d28682726366f97a15aa1888c934d3ecec86c33918b53
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
