# CLAUDE.md — Nexo Project Guide

## What is this?

Nexo is a personal app suite (5-10 users, friends & family) running as individual PWAs on a single €5/mo VPS. Monorepo with SvelteKit 2 + Svelte 5, Tailwind CSS v4, Drizzle ORM, PostgreSQL 17.

Owner: Kevin Rieger. Domain: `krieger2501.de`. All apps share one Postgres database and a central Better Auth server.

## Documentation

Read these for deeper context:

- `docs/architecture.md` — system overview, auth flow, database layout, request lifecycle
- `docs/design.md` — design tokens, typography, spacing, radius, motion
- `docs/local-development.md` — setup, daily workflow, troubleshooting
- `docs/adding-an-app.md` — full checklist for new PWA apps
- `docs/database.md` — schema conventions, migrations, Drizzle Studio
- `docs/deployment.md` — VPS, Docker Compose, CI/CD, backups
- `docs/access-management.md` — email whitelist, per-app access
- `docs/observability.md` — Loki, Grafana, structured logging, correlation IDs
- `docs/i18n.md` — Paraglide setup, message conventions, language resolution

## Project structure

```
apps/
  auth/     → auth.krieger2501.de   (OIDC provider, login UI)
  admin/    → admin.krieger2501.de  (container management, user access)
  finance/  → finance.krieger2501.de (personal finance tracker)
  flaschen/ → flaschen.krieger2501.de (Flaschenpost shift-offer notifier; web + worker)
  landing/  → krieger2501.de        (app directory)
  bot/      → internal              (GitHub webhook deploy automation)
packages/
  db/       → Drizzle schemas + migration runner
  errors/   → Error codes + i18n user messages
  logger/   → Structured JSON logger (pino)
  i18n/     → Language detection, Language type
  push/     → Web Push (VAPID, subscriptions, send helpers, SW handlers)
  email/    → React Email templates
```

## Key commands

```bash
pnpm dev              # all SvelteKit apps (excludes bot)
pnpm dev --filter=@nexo/finance  # single app
pnpm qc              # full quality gate: sort, format, sync, knip, lint, type:check, build, test
pnpm db:generate     # generate migration SQL after schema change
pnpm db:migrate      # apply migrations
pnpm docker:db       # start local Postgres
pnpm docker:observe  # start Loki + Grafana locally
```

## Tech stack quick reference

| What      | How                                                                      |
| --------- | ------------------------------------------------------------------------ |
| Framework | SvelteKit 2 + Svelte 5 runes (`$props`, `$state`, `$derived`, `$effect`) |
| Styling   | Tailwind CSS v4 with `@theme {}` tokens in `app.css`                     |
| i18n      | Paraglide.js — `import { m } from '$lib/paraglide/messages.js'`          |
| ORM       | Drizzle — schemas in `packages/db/schema/`, imported as `@nexo/db`       |
| Auth      | Better Auth — central server at `apps/auth`, apps validate via API       |
| Forms     | SvelteKit form actions with `use:enhance`                                |
| Modals    | Custom `BottomSheet.svelte` (drag-to-dismiss), not a library             |
| Icons     | `lucide-svelte` (tree-shaken)                                            |
| PWA       | `@vite-pwa/sveltekit` with `registerType: 'autoUpdate'`                  |
| Build     | Turborepo — `turbo.json` defines task dependencies                       |
| CI        | GitHub Actions — lint/build/test on PR, deploy on release tag            |

## Established patterns

### Page structure (SvelteKit)

Every feature page has:

- `+page.server.ts` — load data + form actions (CRUD)
- `+page.svelte` — presentation (imports components, uses `$props()` for data)

```typescript
// +page.server.ts pattern
import { db, expenses } from '@nexo/db';
import { eq, and } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { logger } from '$lib/server/logger';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const rows = await db.select().from(expenses).where(eq(expenses.userId, locals.user!.id));
	return { expenses: rows.map((e) => ({ ...e, amount: Number(e.amount) })) };
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		const d = await request.formData();
		// ... validate, insert/update
		// On error: return fail(500, { error: 'DB_ERROR', correlationId: locals.correlationId });
	},
	remove: async ({ request, locals }) => {
		// ... delete with user scoping
	}
};
```

### Component structure (Svelte 5)

```svelte
<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	// Typed props with $props()
	let { data, onEdit }: { data: MyType; onEdit: (item: MyType) => void } = $props();
	// Reactive state
	let open = $state(false);
	// Derived values
	const total = $derived(data.items.reduce((s, i) => s + i.amount, 0));
</script>
```

### Form pattern (with BottomSheet)

```svelte
<script lang="ts">
	import BottomSheet from '$lib/components/layout/BottomSheet.svelte';
	import { enhance } from '$app/forms';
	let { open = $bindable(false), editing }: Props = $props();
</script>

<BottomSheet bind:open title={editing ? 'Edit' : 'New'}>
	<form
		method="POST"
		action="?/save"
		use:enhance={() => {
			return async ({ update }) => {
				await update();
				open = false;
			};
		}}
	>
		{#if editing}<input type="hidden" name="id" value={editing.id} />{/if}
		<!-- fields -->
	</form>
</BottomSheet>
```

### hooks.server.ts pattern

Every app uses `sequence()` with three handles:

1. `i18n.handle()` — Paraglide language resolution
2. `appHandle` — auth check, correlation ID, user scoping, app access check
3. `securityHeaders` — X-Frame-Options, X-Content-Type-Options, Referrer-Policy

### Logger pattern

```typescript
// src/lib/server/logger.ts
import { createLogger } from '@nexo/logger';
export const logger = createLogger('finance'); // app name

// Usage in server code:
logger.info('action description', { userId, correlationId: locals.correlationId });
logger.error('what failed', { error: String(e), correlationId: locals.correlationId });
```

### Error handling pattern

```typescript
// In form actions — return correlationId for user-facing errors
return fail(500, { error: 'ERROR_CODE', correlationId: locals.correlationId });

// In layout — display with @nexo/errors
import { userMessage } from '@nexo/errors';
const errorMsg = $derived(errorCode ? userMessage(errorCode) : null);
```

### i18n pattern

Messages in `messages/{en,de,tr}.json`. Use `$derived` for reactive message arrays:

```svelte
<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	const tabs = $derived([
		{ id: 'recurring', label: m.tab_recurring() },
		{ id: 'once', label: m.tab_once() }
	]);
</script>

<h1>{m.page_title()}</h1>
```

### Database schema pattern

```typescript
// packages/db/schema/<app>.ts
import { pgSchema, text, numeric, boolean, timestamp } from 'drizzle-orm/pg-core';
import { users } from './auth';

export const mySchema = pgSchema('myapp');
export const items = mySchema.table('items', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});
```

Always cast `numeric` to `Number()` when returning to the client.

## Important conventions

### Svelte 5 runes only

- Use `$props()` not `export let`
- Use `$state()` not `let x`
- Use `$derived()` not `$:` reactive statements
- Use `$effect()` not `onMount` for reactive side effects (still use `onMount` for one-time setup with cleanup)
- Use `{@render children()}` not `<slot />`
- Use `$bindable()` for two-way prop binding

### Tailwind CSS v4

- Tokens in `@theme {}` block in `app.css`
- Use `color-mix(in oklab, ...)` for color manipulation, not alpha hex
- Finance uses OKLch color system: `--color-income`, `--color-expense`, `--color-debt`
- Admin accent is blue (`#3b82f6`), finance is green (`#16a34a`)

### TypeScript

- All apps have `"strict": true` and `"allowJs": true` (for Paraglide)
- Import types from `./$types` (SvelteKit generates these)
- Use `locals.user!.id` (non-null assertion is safe after auth guard)
- Monetary amounts are `numeric` in DB but `number` in TypeScript — always `Number(row.amount)`

### Security

- Every request gets a `correlationId` in locals
- All queries scoped by `userId` — never trust client-provided user IDs
- CSRF: custom check in hooks (SvelteKit's built-in is disabled via `csrf: { trustedOrigins: ['*'] }` because of cross-origin auth)
- Security headers set on every response via handle sequence

### PWA

- Each app has `navigateFallback: '/offline'` in workbox config
- `UpdatePrompt.svelte` listens for SW `controllerchange` and shows update toast
- `KonamiCode.svelte` easter egg in each app's layout
- Apple splash screens for iPhone 15/14/SE in `app.html`

### Form actions

- Use hidden `<input name="id">` to signal edit vs. create
- Return `{ success: true }` on success, `fail(500, { error, correlationId })` on failure
- Use `use:enhance` for progressive enhancement without full page reload
- Close bottom sheet in the enhance callback after `update()`

### Navigation

- Finance: `BottomNav.svelte` with popover group for Flows (Expenses/Income/Debt/Commitments)
- Admin: fixed tabbar with Containers/Users/Settings
- Both: `PageHeader.svelte` with title, optional subtitle, actions snippet slot

## File naming conventions

- Routes: `+page.svelte`, `+page.server.ts`, `+layout.svelte`, `+layout.server.ts`
- Components: PascalCase (`ExpenseRow.svelte`, `BottomSheet.svelte`)
- Utilities: camelCase (`utils.ts`, `dateUtils.ts`)
- Shared state: `*.svelte.ts` suffix for files with runes (e.g., `logsState.svelte.ts`)
- i18n messages: `snake_case` keys grouped by feature (`login_heading`, `nav_home`)

## Testing

- Unit tests: Vitest (`*.test.ts` alongside source or in `test/`)
- Finance has integration tests that hit the DB
- No E2E tests currently (Playwright configured but unused)
- Run `pnpm test` or `pnpm qc` (includes tests at the end)

## Common tasks

### Add a new page to an existing app

1. Create `src/routes/<name>/+page.server.ts` (load + actions)
2. Create `src/routes/<name>/+page.svelte` (UI)
3. Add i18n messages to `messages/{en,de,tr}.json`
4. Add nav entry if needed (BottomNav or tabbar)

### Add a new DB table

1. Edit `packages/db/schema/<app>.ts`
2. Export from `packages/db/src/index.ts`
3. Run `pnpm db:generate` then `pnpm db:migrate`

### Add translations

1. Add keys to `messages/en.json`
2. Add translations to `messages/de.json` and `messages/tr.json`
3. Use as `m.key_name()` in components (inside `$derived` for arrays)

### Run quality checks

```bash
pnpm qc  # runs: sort-package-json, prettier, svelte-kit sync, knip, eslint, svelte-check, build, vitest
```

Fix common issues:

- Format: `pnpm format`
- Package sort: `pnpm package:format`
- Lint: `pnpm lint -- --fix` (per-app via turbo)
- Type errors on paraglide: ensure `allowJs: true` in tsconfig

## What NOT to do

- Don't use `<slot />` — use `{@render children()}` (Svelte 5)
- Don't use `$:` reactive statements — use `$derived` or `$effect`
- Don't add `export let` — use `$props()`
- Don't import from `$app/stores` — use `$app/state` (Svelte 5 equivalent)
- Don't put secrets in `$env/static/*` — use `$env/dynamic/private`
- Don't skip the user ID scope in DB queries — every query must filter by `locals.user!.id`
- Don't use `--no-verify` on git hooks
- Don't add dependencies without checking if existing packages cover the need
- Don't create `.d.ts` files for paraglide — `allowJs: true` handles it
- Don't use `uuid` for auth schema IDs — Better Auth uses `text` IDs
