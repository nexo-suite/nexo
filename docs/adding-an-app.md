# Adding a New App

This guide walks through adding a new PWA to the suite — for example, `gym`. Repeat for `time`, `pomodoro`, or anything else.

---

## 1. Create the app directory

```bash
cd apps
mkdir -p gym/src/routes/auth/callback
mkdir -p gym/src/lib/server
mkdir -p gym/src/lib/components
mkdir -p gym/static
mkdir -p gym/messages
mkdir -p gym/project.inlang
```

Or copy the finance app as a starting point and gut the routes:

```bash
cp -r apps/finance apps/gym
```

---

## 2. Add the DB schema

Create `packages/db/schema/gym.ts`:

```typescript
import { pgSchema, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { users } from './auth';

export const gymSchema = pgSchema('gym');

export const workouts = gymSchema.table('workouts', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: uuid('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

// add more tables as needed
```

Export it from `packages/db/src/index.ts`:

```typescript
import * as gymSchema from './schema/gym'; // add this line
export * from './schema/gym'; // add this line

export const db = drizzle(sql, {
	schema: { ...authSchema, ...financeSchema, ...gymSchema } // add gymSchema
});
```

Generate and apply the migration:

```bash
pnpm db:generate
pnpm db:migrate
```

---

## 3. Create package.json

`apps/gym/package.json`:

```json
{
	"name": "@nexo/gym",
	"version": "0.1.0",
	"private": true,
	"type": "module",
	"scripts": {
		"build": "vite build",
		"dev": "vite dev --port 3003",
		"preview": "vite preview",
		"type:check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
		"lint": "eslint ."
	},
	"dependencies": {
		"@nexo/db": "workspace:*",
		"@nexo/errors": "workspace:*",
		"@nexo/logger": "workspace:*",
		"better-auth": "^1.6.10",
		"drizzle-orm": "^0.45.2"
	},
	"devDependencies": {
		"@inlang/paraglide-sveltekit": "^0.16.1",
		"@sveltejs/adapter-node": "^5.5.4",
		"@sveltejs/kit": "^2.59.1",
		"@sveltejs/vite-plugin-svelte": "^7.1.0",
		"@tailwindcss/vite": "^4.2.4",
		"@vite-pwa/sveltekit": "^1.1.0",
		"svelte": "^5.55.5",
		"svelte-check": "^4.4.8",
		"tailwindcss": "^4.2.4",
		"typescript": "^6.0.3",
		"vite": "^8.0.11"
	}
}
```

Pick the next available port (finance is 3002, admin is 3004, so gym gets 3003).

---

## 4. Standard config files

These are identical across all apps — copy from `apps/finance` and adjust the app name:

**`svelte.config.js`** — change nothing, it's the same for all apps.

**`tsconfig.json`** — same as auth/finance.

**`vite.config.ts`** — include Paraglide, Tailwind, SvelteKit, and PWA plugins. Update the PWA manifest name, `short_name`, `theme_color`, and `background_color`:

```typescript
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { paraglide } from '@inlang/paraglide-sveltekit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig, mergeConfig } from 'vite';
import { sharedConfig } from '../../vite.shared';

export default mergeConfig(
	sharedConfig,
	defineConfig({
		plugins: [
			paraglide({ project: './project.inlang', outdir: './src/lib/paraglide' }),
			tailwindcss(),
			sveltekit(),
			SvelteKitPWA({
				registerType: 'autoUpdate',
				manifest: {
					name: 'Gym — Nexo',
					short_name: 'Gym',
					theme_color: '#f97316',
					background_color: '#0a0a0a',
					display: 'standalone'
				},
				workbox: {
					navigateFallback: '/offline'
				}
			})
		]
	})
);
```

**`tsconfig.json`**:

```json
{
	"extends": "./.svelte-kit/tsconfig.json",
	"compilerOptions": {
		"strict": true,
		"allowJs": true,
		"resolveJsonModule": true,
		"skipLibCheck": true
	},
	"include": [
		"src/**/*.ts",
		"src/**/*.svelte",
		".svelte-kit/ambient.d.ts",
		".svelte-kit/non-ambient.d.ts",
		".svelte-kit/types",
		"vite.config.ts",
		"knip.config.ts"
	]
}
```

`allowJs: true` is required for Paraglide's generated `.js` message functions.

---

## 5. Create the auth guard (hooks.server.ts)

`apps/gym/src/hooks.server.ts` — follows the same pattern as all other apps (auth + i18n + security headers):

```typescript
import { redirect, type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { PUBLIC_AUTH_URL } from '$env/static/public';
import { createAuthClient } from 'better-auth/client';
import { i18n } from '$lib/i18n';

const authClient = createAuthClient({ baseURL: PUBLIC_AUTH_URL });

const appHandle: Handle = async ({ event, resolve }) => {
	const session = await authClient.getSession({ fetchOptions: { headers: event.request.headers } });
	event.locals.user = session?.data?.user ?? null;

	if (!event.locals.user && !event.url.pathname.startsWith('/auth')) {
		const redirectTo = encodeURIComponent(event.url.href);
		redirect(303, `${PUBLIC_AUTH_URL}/login?redirectTo=${redirectTo}`);
	}

	return resolve(event);
};

const securityHeaders: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	return response;
};

export const handle = sequence(i18n.handle(), appHandle, securityHeaders);
```

**`src/app.d.ts`** — same as finance:

```typescript
import type { User } from 'better-auth';

declare global {
	namespace App {
		interface Locals {
			user: User | null;
		}
		interface PageData {
			user?: User | null;
		}
		interface Platform {}
		interface Error {
			message: string;
		}
	}
}
export {};
```

**`src/routes/auth/callback/+server.ts`** — same as finance:

```typescript
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url }) => {
	redirect(303, url.searchParams.get('next') ?? '/');
};
```

---

## 6. Create the app shell

**`src/app.html`** — standard SvelteKit shell with PWA links:

```html
<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
		<link rel="manifest" href="/manifest.webmanifest" />
		<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
		<meta name="theme-color" content="#f97316" />
		<meta name="apple-mobile-web-app-capable" content="yes" />
		<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
		%sveltekit.head%
	</head>
	<body data-sveltekit-preload-data="hover">
		%sveltekit.body%
	</body>
</html>
```

**`src/app.css`**:

```css
@import 'tailwindcss';

@theme {
	--color-accent: #f97316;
	/* Add app-specific tokens here */
}
```

---

## 7. Set up i18n (Paraglide)

**`project.inlang/settings.json`**:

```json
{
	"$schema": "https://inlang.com/schema/project-settings",
	"sourceLanguageTag": "en",
	"languageTags": ["en", "de", "tr"],
	"modules": [],
	"plugin.inlang.messageFormat": {
		"pathPattern": "./messages/{languageTag}.json"
	}
}
```

**`messages/en.json`** — start with basic nav and empty states:

```json
{
	"nav_home": "Home"
}
```

Copy to `messages/de.json` and `messages/tr.json` with translations.

**`src/lib/i18n.ts`**:

```typescript
import { createI18n } from '@inlang/paraglide-sveltekit';
import * as runtime from '$lib/paraglide/runtime';

export const i18n = createI18n(runtime);
```

---

## 8. Add .env.local for local dev

`apps/gym/.env.local`:

```bash
DATABASE_URL=postgres://nexo:devpassword@localhost:5433/nexo
BETTER_AUTH_SECRET=<same as root .env>
PUBLIC_AUTH_URL=http://localhost:3001
```

---

## 9. Add to Docker Compose

In `docker-compose.yml`, add an env-block YAML anchor at the top (next to the
existing `x-finance-env`, `x-auth-env`, etc.) and reuse it for both the
production service and its `_unstable` peer:

```yaml
x-gym-env: &gym-env
  DATABASE_URL: ${DATABASE_URL}
  BETTER_AUTH_SECRET: ${BETTER_AUTH_SECRET}
  PUBLIC_AUTH_URL: https://auth.krieger2501.de
  PUBLIC_GYM_URL: https://gym.krieger2501.de
  PROTOCOL_HEADER: x-forwarded-proto
  HOST_HEADER: x-forwarded-host

services:
  gym:
    profiles: [production]
    image: ghcr.io/nexo-suite/nexo-gym:latest
    container_name: nexo-gym
    restart: unless-stopped
    networks: [production]
    environment: *gym-env
    depends_on:
      migrate:
        condition: service_completed_successfully

  gym_unstable:
    profiles: [unstable]
    image: ghcr.io/nexo-suite/nexo-gym:${GYM_UNSTABLE_TAG:-latest}
    container_name: nexo-gym-unstable
    restart: unless-stopped
    networks: [production]
    labels:
      nexo.unstable: 'true'
    environment: *gym-env
    depends_on:
      migrate:
        condition: service_completed_successfully
        required: false
```

The `_unstable` peer joins the same `production` network so it shares the DB,
auth, and intra-stack DNS. `required: false` on `depends_on.migrate` is needed
because `migrate` is a `production`-profile service and the `_unstable` peer
runs without it.

> Compose pulls images from GHCR (`ghcr.io/nexo-suite/nexo-<app>`) — no `build:` block. CI publishes `:latest`, `:<version>`, `:main`, and `:pr-<n>` tags via `@nexo/cli`. The `${GYM_UNSTABLE_TAG:-latest}` interpolation reads from `.env.unstable` on the VPS, written by the bot when a maintainer pins `gym` to a PR. To wire the new app into that pipeline you'll edit `tools/cli/src/apps.ts` (see step 6 below) and `apps/bot/src/state.ts` `UNSTABLE_APPS` so the bot exposes a checkbox for it.

Add to the Caddyfile, using the `unstable_routing` snippet that handles
cookie-based routing + handle_errors fallback:

```
gym.krieger2501.de {
  import common
  import unstable_routing gym gym_unstable
}
```

That single line imports the same matcher logic used by `auth`, `finance`,
`flaschen`, and `landing`. If you need site-specific tweaks (e.g. `flush_interval -1`
for SSE), inline the matcher instead — see the `admin.krieger2501.de` block as
the reference.

---

## 10. Add root scripts

In root `package.json`, add:

```json
"dev:gym":   "turbo dev --filter=@nexo/gym",
"build:gym": "turbo build --filter=@nexo/gym",
```

---

## 11. Add to knip.config.ts

In the root `knip.config.ts`, add a workspace entry:

```typescript
'apps/gym': {
  entry: ['src/routes/**/+*.{ts,js,svelte}'],
  project: ['src/**/*.{ts,js,svelte}'],
  ignoreDependencies: ['tailwindcss']
},
```

---

## 12. Update the landing page

In `apps/landing/messages/en.json`, add description and status messages for the new app.

In `apps/landing/src/routes/+page.svelte`, add the new app to the `apps` array:

```typescript
{
  id: 'gym',
  name: 'Gym',
  icon: '/icon-gym.svg',
  status: 'soon',
  desc: m.app_gym_desc(),
  href: '#',
  meta: 'Summer 2026'
}
```

Add the app icon SVG to `apps/landing/static/icon-gym.svg`.

---

## 13. Add DNS

In your IONOS domain control panel, add a single A record for the production
hostname:

```
gym.krieger2501.de  A  <VPS IP>
```

There's no separate `*.unstable` subdomain — unstable peers reuse the
production hostname via Caddy cookie routing.

---

## Checklist

- [ ] `packages/db/schema/gym.ts` created
- [ ] `packages/db/src/index.ts` updated (import + export + drizzle schema)
- [ ] Migration generated and applied
- [ ] `apps/gym/package.json` with correct port
- [ ] `svelte.config.js`, `tsconfig.json` (with `allowJs: true`), `vite.config.ts` (with PWA + Paraglide)
- [ ] `hooks.server.ts` (auth + i18n + security headers), `app.d.ts`, `app.html`, `app.css`
- [ ] `src/lib/i18n.ts` + `project.inlang/settings.json` + `messages/{en,de,tr}.json`
- [ ] `routes/auth/callback/+server.ts`
- [ ] `routes/offline/+page.svelte` (PWA offline fallback)
- [ ] `apps/gym/.env.local`
- [ ] `apps/gym/Dockerfile` (single-stage `COPY . . + CMD`, see existing apps for the template)
- [ ] `docker-compose.yml` env-block anchor + production service + `_unstable` peer added (with `logging: loki`)
- [ ] `Caddyfile` production entry added (use `import unstable_routing` snippet)
- [ ] `tools/cli/src/apps.ts` — add `{ name: 'gym', dir: 'apps/gym', pkg: '@nexo/gym', image: 'nexo-gym' }`
- [ ] `apps/bot/src/state.ts` — add `'gym'` to `UNSTABLE_APPS` (and the `UnstableApp` union type) so the bot exposes a checkbox for it
- [ ] `scripts/deploy.mjs` — add `nexo-gym` to `PROD_SERVICES` and `gym.krieger2501.de` to `HEALTH_HOSTS`
- [ ] `release-please-config.json` — add the new package so it gets versioned
- [ ] `knip.config.ts` workspace entry added
- [ ] Root `package.json` `dev:gym` / `build:gym` scripts added
- [ ] Landing page messages + `apps` array updated
- [ ] DNS A record added (production only — unstable peers share the production hostname via cookie routing)
- [ ] Auth server `trustedOrigins` updated to include new app URL
