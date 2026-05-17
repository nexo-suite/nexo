# Database

## Overview

One PostgreSQL 17 instance, one database (`nexo`), multiple Postgres schemas for namespace isolation. All schema definitions live in `packages/db/schema/` as TypeScript files and are consumed directly by each app via the `@nexo/db` workspace package.

---

## Schema files

| File                            | Postgres schema | Tables                                                                                                                                                            |
| ------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/db/schema/auth.ts`    | `auth`          | `user`, `session`, `account`, `verification`, `oauth_application`, `oauth_access_token`, `oauth_consent`, `allowed_emails`, `user_app_access`, `user_preferences` |
| `packages/db/schema/finance.ts` | `finance`       | `accounts`, `expenses`, `income`, `debts`, `user_settings`                                                                                                        |

Add new app schemas here as `packages/db/schema/<appname>.ts` and export them from `packages/db/src/index.ts`.

---

## Drizzle client

`packages/db/src/index.ts` exports a single configured `db` client. Every app imports from `@nexo/db`:

```typescript
import { db, expenses, users } from '@nexo/db';
import { eq } from 'drizzle-orm';

const rows = await db.select().from(expenses).where(eq(expenses.userId, userId));
```

The package is consumed as raw TypeScript source via `exports: "./src/index.ts"` — no build step needed. Vite in each app compiles it directly.

---

## Migrations

Migrations are managed by `drizzle-kit`. SQL files live in `packages/db/migrations/`.

### Workflow

```bash
# 1. Edit a schema file in packages/db/schema/
# 2. Generate the migration SQL
pnpm db:generate

# 3. Review the generated file — always read it before applying
cat packages/db/migrations/<timestamp>_<name>.sql

# 4. Apply to local database
pnpm db:migrate
```

Never edit migration files by hand after they've been applied. If you made a mistake, create a new migration that corrects it.

### In production

The `migrate` service in Docker Compose runs `src/migrate.ts` as a one-shot container before any app starts:

```yaml
migrate:
  build: ...
  command: node migrate.ts
  depends_on:
    postgres:
      condition: service_healthy

auth:
  depends_on:
    migrate:
      condition: service_completed_successfully
```

Migrations run automatically on every `docker compose up`. If they fail, the app containers don't start.

---

## Drizzle Studio

Visual database browser:

```bash
pnpm db:studio
# opens https://local.drizzle.studio
```

---

## Schema conventions

- Auth table IDs: `text('id').primaryKey()` (Better Auth generates string IDs)
- Finance table IDs: `uuid('id').primaryKey().defaultRandom()`
- All timestamps: `timestamp('...', { withTimezone: true }).notNull().defaultNow()`
- All user references: `text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' })`
- Column names: `camelCase` in TypeScript, `snake_case` in Postgres (Drizzle handles the mapping)
- Monetary amounts: `numeric('amount', { precision: 12, scale: 2 })` — always cast to `Number()` when doing arithmetic
- Better Auth tables use their expected names (`user`, `session`, `account`) — not pluralized

---

## Adding a column

```typescript
// packages/db/schema/finance.ts
export const expenses = financeSchema.table('expenses', {
	// ... existing columns
	tags: text('tags').array() // new column
});
```

```bash
pnpm db:generate   # generates ALTER TABLE ... ADD COLUMN
pnpm db:migrate
```

---

## Direct Postgres access

```bash
# Local (Docker)
docker exec -it nexo-postgres-1 psql -U nexo -d nexo

# Production (on the VPS)
docker compose exec postgres psql -U nexo -d nexo
```

Useful queries:

```sql
-- List all schemas
\dn

-- List tables in finance schema
\dt finance.*

-- List tables in auth schema
\dt auth.*

-- Check allowed emails
SELECT * FROM auth.allowed_emails;

-- Check user app access
SELECT u.email, a.app FROM auth."user" u
JOIN auth.user_app_access a ON a.user_id = u.id
ORDER BY u.email;

-- Check user preferences
SELECT u.email, p.language, p.theme, p.birthday
FROM auth."user" u
JOIN auth.user_preferences p ON p.user_id = u.id;
```

---

## Backups

See [Deployment — Backups](deployment.md#backups).
