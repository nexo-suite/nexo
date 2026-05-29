# Changelog

## [0.9.0](https://github.com/nexo-suite/nexo/compare/finance-v0.8.0...finance-v0.9.0) (2026-05-29)


### Features

* **ui:** GreetingHeader + refreshed PageHeader across all apps ([286dd97](https://github.com/nexo-suite/nexo/commit/286dd97a2b53b5d30b9532611c0f70b6512763ec))


### Bug Fixes

* **admin:** drop legacy .sheet-backdrop/.sheet-* rules colliding with BottomSheet ([96d9c82](https://github.com/nexo-suite/nexo/commit/96d9c824497643e1b057c82d1ad13b5b0716e3ff))

## [0.8.0](https://github.com/nexo-suite/nexo/compare/finance-v0.7.0...finance-v0.8.0) (2026-05-27)


### Features

* **calorie:** inline add panel, custom foods, OFF localization & cleanup ([b4be417](https://github.com/nexo-suite/nexo/commit/b4be417a83c49f7977796ed77885cd642a9d5cc1))

## [0.7.0](https://github.com/nexo-suite/nexo/compare/finance-v0.6.0...finance-v0.7.0) (2026-05-25)


### Features

* modernize toolchain + calorie app + admin redesign + observability ([9ae85a6](https://github.com/nexo-suite/nexo/commit/9ae85a61b08d2ff8f62d0ba6568ef4dee9dfd1bf))

## [0.6.0](https://github.com/nexo-suite/nexo/compare/finance-v0.5.1...finance-v0.6.0) (2026-05-23)


### Features

* deploy/observability platform + landing apps polish ([5c12105](https://github.com/nexo-suite/nexo/commit/5c12105cce5f297fa28690ea07c307ead8354114))

## [0.5.1](https://github.com/nexo-suite/nexo/compare/finance-v0.5.0...finance-v0.5.1) (2026-05-21)


### Bug Fixes

* **infra:** switch Docker installs from --offline to --prefer-offline ([8dbd86b](https://github.com/nexo-suite/nexo/commit/8dbd86baef9501c117dfa2320ccda4f11f7fa0f9))

## [0.5.0](https://github.com/nexo-suite/nexo/compare/finance-v0.4.0...finance-v0.5.0) (2026-05-20)


### Features

* **finance:** adopt shared UI components, add user avatar menu ([d31f505](https://github.com/nexo-suite/nexo/commit/d31f505fc3796f2d47dd016e05c9b2d01c5bd353))

## [0.4.0](https://github.com/krieger2501/nexo/compare/finance-v0.3.0...finance-v0.4.0) (2026-05-19)


### Features

* **infra:** add /healthz endpoints to all apps ([7888d90](https://github.com/krieger2501/nexo/commit/7888d905901eaabc25d1ab0668edec24e56a9d41))
* **profile:** integrate profile hub on finance + landing ([8fe465c](https://github.com/krieger2501/nexo/commit/8fe465cde675ffdadab56f267090ce967756841d))


### Bug Fixes

* **infra:** set CI=true in Dockerfiles for pnpm v11 ([9724a0f](https://github.com/krieger2501/nexo/commit/9724a0f5f1cfccb8d296400da3084ec8528570ca))

## [0.3.0](https://github.com/krieger2501/nexo/compare/finance-v0.2.0...finance-v0.3.0) (2026-05-19)


### Features

* **security:** add CSP, HSTS, and Permissions-Policy headers ([6d165f1](https://github.com/krieger2501/nexo/commit/6d165f1e98588d0ad631993a9ae316964ed2e5eb))


### Bug Fixes

* **finance,landing:** mobile bottom-nav polish + i18n WIP hints ([bad2732](https://github.com/krieger2501/nexo/commit/bad2732bf056c2d349c806fc9c31ce6fd55a5398))
* **finance:** hub link falls back to localhost in dev ([b97628f](https://github.com/krieger2501/nexo/commit/b97628fb656e9f5d9a3b2a7f9c8e3eccf2f8fdfe))
* **finance:** scope reconcile + validate accountId ownership ([663c67c](https://github.com/krieger2501/nexo/commit/663c67cf8ec2a0523c4f16fa1ad9881245ba9238))
* **finance:** set PUBLIC_LANDING_URL on finance container ([6b3abcc](https://github.com/krieger2501/nexo/commit/6b3abcc6f4e1fc19b4f8de14743226351fb26646))
* **finance:** tint flow popover row + commitments gray ([729c04f](https://github.com/krieger2501/nexo/commit/729c04fb17b0e877f8ebb36bd59f52ab1a8592f5))
* **security:** enforce CSP via directives, drop reportOnly ([3c82060](https://github.com/krieger2501/nexo/commit/3c820605f86459afbf098867aba40f93d603aa0d))
* **security:** require origin on CSRF + show real OAuth consent ([b0c96de](https://github.com/krieger2501/nexo/commit/b0c96de30c1882dc1a2373f10bfc09b0c87997be))
* **ui,finance:** portrait-only on phones + flow-tinted Flows tab ([f567e07](https://github.com/krieger2501/nexo/commit/f567e07cedd19fe0e36f5aa1fef3b5836518633f))

## [0.2.0](https://github.com/krieger2501/nexo/compare/finance-v0.1.0...finance-v0.2.0) (2026-05-18)


### Features

* add admin PWA + i18n infrastructure with paraglide.js ([0ce79d0](https://github.com/krieger2501/nexo/commit/0ce79d064939575beca34e200c9acd24b8ba790d))
* add logger utility to auth and finance apps ([9cab61a](https://github.com/krieger2501/nexo/commit/9cab61a22b9eced4a060b2483c513a231097d85a))
* admin services panel, Loki/Grafana observability, correlation IDs ([bea0336](https://github.com/krieger2501/nexo/commit/bea033679f80cac0d4487f24a2b7dad900fd4e67))
* app access enforcement + admin UI polish ([de6580c](https://github.com/krieger2501/nexo/commit/de6580c8357ec533ed23e0f47e61a1675ab49782))
* draggable bottom sheet + admin PWA safe-area fixes ([39d10dc](https://github.com/krieger2501/nexo/commit/39d10dcde510d91f12a6458c2a98f232b50b13a9))
* **finance:** commitments page with fund allocation and grouped nav ([618db40](https://github.com/krieger2501/nexo/commit/618db40b878b877719a2b6f7e7364d7905277422))
* **finance:** v2 dashboard, form extraction, remove shadcn-svelte UI lib ([d93fed8](https://github.com/krieger2501/nexo/commit/d93fed88129cd581cbf3ed0fff4e79710107e9b3))
* framework best practices — security headers, preload, nav progress, error pages ([c83f1ae](https://github.com/krieger2501/nexo/commit/c83f1ae80aa4d19a7574a98b0c30093234215c51))
* **i18n:** wire up paraglide messages in auth, landing, admin, finance ([8ea1512](https://github.com/krieger2501/nexo/commit/8ea151282203dbb673c1ea685918163f00bfefa3))
* initial commit ([e8dd4c9](https://github.com/krieger2501/nexo/commit/e8dd4c907e1cf5b545c52c01582c5b95b734c636))
* iOS PWA polish — offline pages, update prompt, splash screen links ([9df11b0](https://github.com/krieger2501/nexo/commit/9df11b0a3bc8d29b3332d864a238f21e93366e27))
* personality system — blue admin theme, Konami code easter egg ([93d3cd6](https://github.com/krieger2501/nexo/commit/93d3cd62d15f7b6fab78a65c9b287e28082e84d5))
* transactional emails, app icons, and admin access UX ([9bd360b](https://github.com/krieger2501/nexo/commit/9bd360b9d983cb41009fb5ea51c06d3604247eae))


### Bug Fixes

* add missing PUBLIC_AUTH_URL build ARG to auth/finance, fix migrate Dockerfile ([c806218](https://github.com/krieger2501/nexo/commit/c8062186813aa3fce8f63d8259fa69c94e0523a4))
* add pnpm-lock.yaml to all Dockerfiles for frozen install ([b58a00d](https://github.com/krieger2501/nexo/commit/b58a00deec7f5466934bd732880b7dccdb19cdb6))
* auth .well-known handlers pass event.request; update docs and CI pipeline ([2dd9557](https://github.com/krieger2501/nexo/commit/2dd955751e40497c55d3963286fa9905b8358d6c))
* copy vite.shared.ts into Docker build context ([99f53af](https://github.com/krieger2501/nexo/commit/99f53afc2bfc657d1479467b47adf1573fbcc2fc))
* correct OAuth login flow, CSRF, and URL protocol in Docker ([ab43deb](https://github.com/krieger2501/nexo/commit/ab43deba17c3406532da43afb3fd057e9bb318e2))
* cross-subdomain cookies + structured logging for auth flow ([121f105](https://github.com/krieger2501/nexo/commit/121f105bdd224f95328dd7aad0fda560eb38924c))
* explicit paraglide compile step, bot Dockerfile, clean paraglide output ([4146e0d](https://github.com/krieger2501/nexo/commit/4146e0d35c940bc005e9d0cf00c0cbb927f035ee))
* **finance:** use __APP_VERSION__ in account menu ([165d4c4](https://github.com/krieger2501/nexo/commit/165d4c4501c4c398d6c24c81cdf05a5df8938fdd))
* **finance:** UX audit fixes and dashboard improvements ([beea1c8](https://github.com/krieger2501/nexo/commit/beea1c88ab4e9f2a920014a2b7003aedeb4a7dad))
* lint issues and bot caddy file ([cd905fa](https://github.com/krieger2501/nexo/commit/cd905fa3a88dd5a0d8995595e80d4395338f48cc))
* non-null DATABASE_URL + dynamic/public for PUBLIC_APP_VERSION in finance ([91ed291](https://github.com/krieger2501/nexo/commit/91ed29181e066e2e602a1e7596618dcc24e0331e))
* proper SvelteKit env module usage with .env.build declaration files ([1442bb9](https://github.com/krieger2501/nexo/commit/1442bb9ed2c7ec95a13818697236e554b58edba9))
* remove unused monthStart variable ([2f8fbee](https://github.com/krieger2501/nexo/commit/2f8fbee934819d02cc3465372ca05497a24ebe32))
* replace SvelteKit env module imports with process.env for server-only secrets ([99adb53](https://github.com/krieger2501/nexo/commit/99adb53112d8f3f870cb262af9a78ea28df37a83))
* resolve all pnpm qc failures ([d9e9aed](https://github.com/krieger2501/nexo/commit/d9e9aeda888cca3a91bc73385668a870ec497da2))
* resolve lint and knip CI failures ([67b721d](https://github.com/krieger2501/nexo/commit/67b721de9ea4bf5019fde6f88ce25fc0bc2b72c0))
* run svelte-kit sync before knip in SvelteKit apps to generate $types in CI ([9c487e8](https://github.com/krieger2501/nexo/commit/9c487e8b94c11fc3430717439ffe976869d55c45))
* switch private/runtime env vars to dynamic, keep only PUBLIC_APP_VERSION as static ([9d2d6d7](https://github.com/krieger2501/nexo/commit/9d2d6d740a2d72ebd6c22b81e05497211b91f308))
* write PUBLIC_* vars to .env before vite build (SvelteKit static/public requires .env or process.env) ([70ca346](https://github.com/krieger2501/nexo/commit/70ca3468ebf1ba9f3101fc9afaefa29fee090639))
