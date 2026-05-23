# syntax=docker/dockerfile:1.7
#
# Thin runtime image. Build context is produced by `nexo prepare-contexts`,
# which runs `pnpm --prod deploy` for this app. The deployed
# context contains the compiled dist/, the bot's package.json, and a
# node_modules with @nexo/logger resolved via its exports map.

FROM node:24-alpine
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app

COPY --chown=app:app . .

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

CMD ["node", "dist/index.js"]
