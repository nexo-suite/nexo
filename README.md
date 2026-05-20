# Nexo

A self-hosted personal app suite delivered as individual PWAs. Each app installs independently on your iPhone home screen. One login, one server, one database.

**Live:** `krieger2501.de` · Auth: `auth.krieger2501.de` · Finance: `finance.krieger2501.de`

---

## Apps

| App           | URL                        | Status  |
| ------------- | -------------------------- | ------- |
| Finance       | `finance.krieger2501.de`   | Active  |
| Admin         | `admin.krieger2501.de`     | Active  |
| Bot           | internal / GitHub webhooks | Active  |
| Landing       | `krieger2501.de`           | Active  |
| Gym           | `gym.krieger2501.de`       | Planned |
| Time Tracking | `time.krieger2501.de`      | Planned |
| Pomodoro      | `pomodoro.krieger2501.de`  | Planned |

---

## Packages

| Package        | Purpose                                        |
| -------------- | ---------------------------------------------- |
| `@nexo/db`     | Shared Drizzle schemas, migration runner       |
| `@nexo/errors` | Error codes + i18n-aware user-facing messages  |
| `@nexo/logger` | Structured JSON logger (pino) with correlation |
| `@nexo/i18n`   | Language detection utilities, `Language` type  |
| `@nexo/email`  | Shared email templates (React Email)           |

---

## Documentation

- [Architecture](docs/architecture.md) — system design, auth flow, database layout, observability
- [Design System](docs/design.md) — visual language, tokens, components, motion
- [Local Development](docs/local-development.md) — prerequisites, setup, daily workflow
- [Adding a New App](docs/adding-an-app.md) — step-by-step guide to scaffold the next PWA
- [Database](docs/database.md) — schema conventions, running migrations, Drizzle Studio
- [Deployment](docs/deployment.md) — VPS setup, Docker Compose, CI/CD, going live
- [Access Management](docs/access-management.md) — whitelisting users, per-app access
- [Observability](docs/observability.md) — Loki, Grafana, structured logging, correlation IDs
- [Internationalization](docs/i18n.md) — Paraglide setup, adding translations, language resolution

---

## Quick start (local)

```bash
git clone https://github.com/nexo-suite/nexo
cd nexo
pnpm install
cp .env.example .env      # fill in OAuth credentials + secrets
pnpm docker:db            # start Postgres in Docker
pnpm db:migrate           # run migrations
pnpm dev                  # start all apps
```

See [Local Development](docs/local-development.md) for the full walkthrough including OAuth app setup.

---

## Stack

| Layer         | Choice                          |
| ------------- | ------------------------------- |
| Framework     | SvelteKit 2 + Svelte 5 (runes)  |
| Language      | TypeScript 6, strict            |
| Styling       | Tailwind CSS v4                 |
| i18n          | Paraglide.js (compile-time)     |
| ORM           | Drizzle ORM                     |
| Auth          | Better Auth (OIDC provider)     |
| Database      | PostgreSQL 17                   |
| Logging       | pino (JSON) → Loki → Grafana    |
| Reverse proxy | Caddy 2 (auto TLS)              |
| Containers    | Docker Compose                  |
| Monorepo      | pnpm workspaces + Turborepo     |
| CI/CD         | GitHub Actions + release-please |
| Node          | 24 LTS                          |

---

## Root scripts

```bash
pnpm dev                  # all apps in parallel (excludes bot)
pnpm dev:finance          # single app
pnpm dev:bot              # bot only (separate because it's not SvelteKit)
pnpm build                # all apps, in dependency order
pnpm type:check           # tsc + svelte-check everywhere
pnpm lint                 # eslint everywhere
pnpm format               # prettier write
pnpm test                 # vitest everywhere
pnpm qc                   # full quality gate (sort, format, sync, knip, lint, type:check, build, test)
pnpm package:check        # verify package.json sort order
pnpm db:generate          # generate migration SQL from schema changes
pnpm db:migrate           # apply pending migrations
pnpm db:studio            # Drizzle Studio in browser
pnpm docker:db            # start local Postgres container
pnpm docker:up            # full local Docker stack (all apps)
pnpm docker:up:server     # production-like stack (with Caddy + bot)
pnpm docker:observe       # start Loki + Grafana for local log viewing
```
