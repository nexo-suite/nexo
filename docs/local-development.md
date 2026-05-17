# Local Development

## Prerequisites

Install these once on your machine:

```bash
# Node 24 LTS — use nvm (recommended) or download from nodejs.org
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
nvm install 24
nvm use 24

# pnpm (via corepack, ships with Node)
corepack enable
pnpm -v   # should show 11.x

# Docker Desktop — docker.com/products/docker-desktop
docker -v
```

---

## One-time setup

### 1. Clone and install

```bash
git clone https://github.com/krieger2501/nexo
cd nexo
pnpm install
```

### 2. Create OAuth apps (~10 min)

You need real OAuth credentials even locally. Each provider needs a redirect URI pointing at `http://localhost:3001`.

**Google** → [console.cloud.google.com](https://console.cloud.google.com)

1. New project (or reuse one) → APIs & Services → Credentials
2. Create Credentials → OAuth 2.0 Client ID → Web application
3. Authorized redirect URI: `http://localhost:3001/api/auth/callback/google`
4. Copy Client ID and Client Secret

**GitHub** → [github.com/settings/developers](https://github.com/settings/developers)

1. New OAuth App
2. Homepage URL: `http://localhost:3001`
3. Authorization callback URL: `http://localhost:3001/api/auth/callback/github`
4. Generate a client secret, copy both values

**Discord** → [discord.com/developers/applications](https://discord.com/developers/applications)

1. New Application → OAuth2 tab
2. Add redirect: `http://localhost:3001/api/auth/callback/discord`
3. Copy Client ID and Client Secret

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` — the minimum required values:

```bash
POSTGRES_PASSWORD=devpassword
DATABASE_URL=postgres://nexo:devpassword@postgres:5432/nexo

# Generate with: openssl rand -hex 32
BETTER_AUTH_SECRET=<random>

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...
```

You also need per-app `.env.local` files. `.env.example` has the exact contents for each — copy the relevant block and create the file:

- `apps/auth/.env.local` — `DATABASE_URL` (localhost), `BETTER_AUTH_SECRET`, `PUBLIC_AUTH_URL`, OAuth keys
- `apps/finance/.env.local` — `DATABASE_URL` (localhost), `BETTER_AUTH_SECRET`, `PUBLIC_AUTH_URL`
- `apps/admin/.env.local` — `DATABASE_URL` (localhost), `BETTER_AUTH_SECRET`, `PUBLIC_AUTH_URL`
- `apps/landing/.env.local` — `DATABASE_URL` (localhost), `BETTER_AUTH_SECRET`, `PUBLIC_AUTH_URL`, `PUBLIC_FINANCE_URL`
- `.env.local` (repo root) — `DATABASE_URL` with `localhost:5433` for Drizzle CLI tools

### 4. Start Postgres and run migrations

```bash
pnpm docker:db       # starts only the postgres container (production profile)
pnpm db:migrate      # creates all schemas and tables
```

### 5. Whitelist your email

```bash
docker exec -it nexo-postgres-1 psql -U nexo -d nexo \
  -c "INSERT INTO auth.allowed_emails (email) VALUES ('your@email.com');"
```

### 6. Start the dev servers

```bash
pnpm dev
```

Turborepo starts all SvelteKit apps concurrently (bot excluded by default):

| App     | URL                   |
| ------- | --------------------- |
| Landing | http://localhost:3000 |
| Auth    | http://localhost:3001 |
| Finance | http://localhost:3002 |
| Admin   | http://localhost:3004 |

Open `http://localhost:3002` — you'll be redirected to the auth server, sign in, and land back in the finance app.

To also run the bot (needs GitHub App credentials):

```bash
pnpm dev:bot
```

---

## Daily workflow

### Starting up

```bash
pnpm docker:db   # if Postgres isn't already running
pnpm dev         # start all dev servers
```

Or start just the app you're working on:

```bash
pnpm dev:finance
pnpm dev:admin
```

### Making schema changes

```bash
# 1. Edit packages/db/schema/finance.ts (or auth.ts)
# 2. Generate the migration SQL
pnpm db:generate
# 3. Review the generated file in packages/db/migrations/
# 4. Apply it
pnpm db:migrate
```

The TypeScript types update immediately since the schema files are imported directly.

### Inspecting the database

```bash
pnpm db:studio
```

Opens Drizzle Studio at `https://local.drizzle.studio` — a visual browser for all tables.

### Running checks before committing

```bash
pnpm qc   # full quality gate: sort, format, sync, knip, lint, type:check, build, test
```

Or run individual steps while developing:

```bash
pnpm type:check   # TypeScript + svelte-check
pnpm lint         # ESLint
pnpm format       # Prettier
pnpm test         # Vitest unit tests
```

### Adding or updating translations

Each app has `messages/{en,de,tr}.json` files. Edit the JSON directly, then run:

```bash
pnpm dev   # Paraglide recompiles messages on save
```

The generated `$lib/paraglide/messages.js` updates automatically during dev.

---

## Observability (local)

To view structured logs in Grafana locally:

```bash
pnpm docker:observe   # starts Loki + Grafana
```

Then open `http://localhost:3100` (Grafana). The Loki datasource is pre-configured.

To stop:

```bash
pnpm docker:observe:down
```

---

## Full Docker stack (optional)

If you want to run everything inside Docker exactly as it runs in production:

```bash
pnpm docker:up
```

`docker-compose.override.yml` is automatically merged when you run `docker compose`, which maps ports and swaps the hardcoded production URLs (`https://auth.krieger2501.de`) with `http://localhost:300x`. Without it the production compose hardcodes `https://` URLs and won't work locally, so keep both files.

To stop:

```bash
pnpm docker:down
```

---

## Ports

| Service  | Native dev | Docker |
| -------- | ---------- | ------ |
| Landing  | 3000       | 3000   |
| Auth     | 3001       | 3001   |
| Finance  | 3002       | 3002   |
| Admin    | 3004       | 3004   |
| Postgres | —          | 5433   |
| Grafana  | —          | 3100   |

---

## Troubleshooting

**`DATABASE_URL is not set` when running `pnpm db:migrate`**
Check that `.env` exists at the repo root and has `POSTGRES_PASSWORD` set. The `db:*` scripts load `.env.local` first, then `.env`.

**`relation "auth.allowed_emails" does not exist`**
Migrations haven't run yet. Run `pnpm db:migrate`.

**Auth redirect loops back to login**
Your email isn't in `auth.allowed_emails`. Run the INSERT command from step 5 above.

**Postgres container name doesn't match**
The `docker exec` command uses the container name Docker assigns. If it differs, check with `docker ps` and adjust.

**Paraglide messages not updating**
The Paraglide Vite plugin recompiles on file change during dev. If messages seem stale, restart the dev server. The compiled output is `.js` only (no `.d.ts`) — `allowJs: true` in tsconfig handles type inference.

**`svelte-check` errors on `$lib/paraglide/messages`**
Ensure `allowJs: true` is in the app's `tsconfig.json`. The Paraglide plugin generates JS with JSDoc annotations, not TypeScript declarations.
