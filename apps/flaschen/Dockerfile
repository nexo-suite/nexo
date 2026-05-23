# syntax=docker/dockerfile:1.7
#
# Thin runtime image. Build context is produced by `nexo prepare-contexts`,
# which runs `pnpm --prod deploy` for this app — so the context
# already contains package.json, node_modules, and the build/ output. The
# same image runs the SvelteKit server (`node build`) and the worker
# (`node build/worker/index.js`) — see docker-compose.yml.

FROM node:24-alpine
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app

COPY --chown=app:app . .

USER app
ENV NODE_ENV=production
ENV PORT=3000

ARG GIT_COMMIT=dev
ARG BUILD_TIME=
ENV GIT_COMMIT=$GIT_COMMIT
ENV BUILD_TIME=$BUILD_TIME

EXPOSE 3000
CMD ["node", "build"]
