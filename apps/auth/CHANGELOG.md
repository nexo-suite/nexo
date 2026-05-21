# Changelog

## [0.6.0](https://github.com/nexo-suite/nexo/compare/auth-v0.5.0...auth-v0.6.0) (2026-05-21)


### Features

* **auth:** typed app.d.ts and structured healthz ([a5b8e6e](https://github.com/nexo-suite/nexo/commit/a5b8e6eb831d6c8660614b4e1e688779962fbe7a))


### Bug Fixes

* **infra:** switch Docker installs from --offline to --prefer-offline ([8dbd86b](https://github.com/nexo-suite/nexo/commit/8dbd86baef9501c117dfa2320ccda4f11f7fa0f9))

## [0.5.0](https://github.com/nexo-suite/nexo/compare/auth-v0.4.0...auth-v0.5.0) (2026-05-20)


### Features

* **auth:** tighten hooks, structured healthz, app.d.ts types ([478c836](https://github.com/nexo-suite/nexo/commit/478c8361acd66446d6cba8afaf99ed05d596eb42))

## [0.4.0](https://github.com/krieger2501/nexo/compare/auth-v0.3.0...auth-v0.4.0) (2026-05-19)


### Features

* **flaschen:** add Flaschenpost shift-offer notifier app ([e35a981](https://github.com/krieger2501/nexo/commit/e35a981bb99429d7e7ad1cd2a8ecaa6aa040091e))
* **infra:** add /healthz endpoints to all apps ([7888d90](https://github.com/krieger2501/nexo/commit/7888d905901eaabc25d1ab0668edec24e56a9d41))


### Bug Fixes

* **infra:** set CI=true in Dockerfiles for pnpm v11 ([9724a0f](https://github.com/krieger2501/nexo/commit/9724a0f5f1cfccb8d296400da3084ec8528570ca))

## [0.3.0](https://github.com/krieger2501/nexo/compare/auth-v0.2.0...auth-v0.3.0) (2026-05-19)


### Features

* **security:** add CSP, HSTS, and Permissions-Policy headers ([6d165f1](https://github.com/krieger2501/nexo/commit/6d165f1e98588d0ad631993a9ae316964ed2e5eb))


### Bug Fixes

* **security:** enforce CSP via directives, drop reportOnly ([3c82060](https://github.com/krieger2501/nexo/commit/3c820605f86459afbf098867aba40f93d603aa0d))
* **security:** require origin on CSRF + show real OAuth consent ([b0c96de](https://github.com/krieger2501/nexo/commit/b0c96de30c1882dc1a2373f10bfc09b0c87997be))

## [0.2.0](https://github.com/krieger2501/nexo/compare/auth-v0.1.0...auth-v0.2.0) (2026-05-18)


### Features

* add admin panel app at admin.krieger2501.de ([956fa23](https://github.com/krieger2501/nexo/commit/956fa233cef7f70a4dd8f450da605a12a79ffb1f))
* add admin PWA + i18n infrastructure with paraglide.js ([0ce79d0](https://github.com/krieger2501/nexo/commit/0ce79d064939575beca34e200c9acd24b8ba790d))
* add logger utility to auth and finance apps ([9cab61a](https://github.com/krieger2501/nexo/commit/9cab61a22b9eced4a060b2483c513a231097d85a))
* admin services panel, Loki/Grafana observability, correlation IDs ([bea0336](https://github.com/krieger2501/nexo/commit/bea033679f80cac0d4487f24a2b7dad900fd4e67))
* app access enforcement + admin UI polish ([de6580c](https://github.com/krieger2501/nexo/commit/de6580c8357ec533ed23e0f47e61a1675ab49782))
* **auth:** UI refresh, signout route, Dockerfile fix ([9949f32](https://github.com/krieger2501/nexo/commit/9949f32115ea484be4d8ccf7ca3257646f8b7529))
* framework best practices — security headers, preload, nav progress, error pages ([c83f1ae](https://github.com/krieger2501/nexo/commit/c83f1ae80aa4d19a7574a98b0c30093234215c51))
* grouped list filters + funny app access messages ([714d757](https://github.com/krieger2501/nexo/commit/714d7579e6874289b0fa3724dab0eaac6c2f0847))
* **i18n:** wire up paraglide messages in auth, landing, admin, finance ([8ea1512](https://github.com/krieger2501/nexo/commit/8ea151282203dbb673c1ea685918163f00bfefa3))
* initial commit ([e8dd4c9](https://github.com/krieger2501/nexo/commit/e8dd4c907e1cf5b545c52c01582c5b95b734c636))
* inline error banner on login page, loading state on provider buttons ([3e5310a](https://github.com/krieger2501/nexo/commit/3e5310adb30e5d9b6ce7d1c1e307aceee384a587))
* transactional emails, app icons, and admin access UX ([9bd360b](https://github.com/krieger2501/nexo/commit/9bd360b9d983cb41009fb5ea51c06d3604247eae))


### Bug Fixes

* add missing PUBLIC_AUTH_URL build ARG to auth/finance, fix migrate Dockerfile ([c806218](https://github.com/krieger2501/nexo/commit/c8062186813aa3fce8f63d8259fa69c94e0523a4))
* add non-null assertions to required env vars in auth ([5c3c96d](https://github.com/krieger2501/nexo/commit/5c3c96df8b674e445e092100cafb0a62aacae4d2))
* add pnpm-lock.yaml to all Dockerfiles for frozen install ([b58a00d](https://github.com/krieger2501/nexo/commit/b58a00deec7f5466934bd732880b7dccdb19cdb6))
* auth .well-known handlers pass event.request; update docs and CI pipeline ([2dd9557](https://github.com/krieger2501/nexo/commit/2dd955751e40497c55d3963286fa9905b8358d6c))
* auth no-zoom, app filter All chip, subtitle breakdown ([728c1dc](https://github.com/krieger2501/nexo/commit/728c1dc5e6082efa4434864f88e2c62094255e03))
* copy vite.shared.ts into Docker build context ([99f53af](https://github.com/krieger2501/nexo/commit/99f53afc2bfc657d1479467b47adf1573fbcc2fc))
* correct OAuth login flow, CSRF, and URL protocol in Docker ([ab43deb](https://github.com/krieger2501/nexo/commit/ab43deba17c3406532da43afb3fd057e9bb318e2))
* correct pnpm filter names to @nexo/* in Dockerfiles ([0c630aa](https://github.com/krieger2501/nexo/commit/0c630aa2244d4914fadf4fb466d44f7c3dc11a77))
* cross-subdomain cookies + structured logging for auth flow ([121f105](https://github.com/krieger2501/nexo/commit/121f105bdd224f95328dd7aad0fda560eb38924c))
* explicit paraglide compile step, bot Dockerfile, clean paraglide output ([4146e0d](https://github.com/krieger2501/nexo/commit/4146e0d35c940bc005e9d0cf00c0cbb927f035ee))
* non-null DATABASE_URL + dynamic/public for PUBLIC_APP_VERSION in finance ([91ed291](https://github.com/krieger2501/nexo/commit/91ed29181e066e2e602a1e7596618dcc24e0331e))
* proper SvelteKit env module usage with .env.build declaration files ([1442bb9](https://github.com/krieger2501/nexo/commit/1442bb9ed2c7ec95a13818697236e554b58edba9))
* replace SvelteKit env module imports with process.env for server-only secrets ([99adb53](https://github.com/krieger2501/nexo/commit/99adb53112d8f3f870cb262af9a78ea28df37a83))
* run svelte-kit sync before knip in SvelteKit apps to generate $types in CI ([9c487e8](https://github.com/krieger2501/nexo/commit/9c487e8b94c11fc3430717439ffe976869d55c45))
* switch private/runtime env vars to dynamic, keep only PUBLIC_APP_VERSION as static ([9d2d6d7](https://github.com/krieger2501/nexo/commit/9d2d6d740a2d72ebd6c22b81e05497211b91f308))
* write PUBLIC_* vars to .env before vite build (SvelteKit static/public requires .env or process.env) ([70ca346](https://github.com/krieger2501/nexo/commit/70ca3468ebf1ba9f3101fc9afaefa29fee090639))
