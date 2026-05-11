# Changelog

## [0.7.0](https://github.com/krieger2501/nexo/compare/nexo-v0.6.0...nexo-v0.7.0) (2026-05-11)


### Features

* **admin:** mobile-responsive layout with bottom tab bar ([b2ae4ae](https://github.com/krieger2501/nexo/commit/b2ae4ae078d33cfc35bf296913af8ebd9995eaad))


### Bug Fixes

* add admin to preview stack and Caddyfile ([6e7dde7](https://github.com/krieger2501/nexo/commit/6e7dde79ea3ed434baf86f90c1670880b8d03eb0))
* reload Caddy config after production deploy ([cb679f6](https://github.com/krieger2501/nexo/commit/cb679f640971b9d51ccbfb917ace8cecd89913dd))

## [0.6.0](https://github.com/krieger2501/nexo/compare/nexo-v0.5.0...nexo-v0.6.0) (2026-05-11)


### Features

* add admin panel app at admin.krieger2501.de ([956fa23](https://github.com/krieger2501/nexo/commit/956fa233cef7f70a4dd8f450da605a12a79ffb1f))


### Bug Fixes

* add missing eslint/knip/gitignore configs to admin app ([55b69db](https://github.com/krieger2501/nexo/commit/55b69dbc1f02b19636c7616b9f2619a9d207aca1))

## [0.5.0](https://github.com/krieger2501/nexo/compare/nexo-v0.4.0...nexo-v0.5.0) (2026-05-11)


### Features

* **finance:** commitments page with fund allocation and grouped nav ([618db40](https://github.com/krieger2501/nexo/commit/618db40b878b877719a2b6f7e7364d7905277422))


### Bug Fixes

* **finance:** UX audit fixes and dashboard improvements ([beea1c8](https://github.com/krieger2501/nexo/commit/beea1c88ab4e9f2a920014a2b7003aedeb4a7dad))
* remove invalid packageManager field from renovate.json ([07d4bc4](https://github.com/krieger2501/nexo/commit/07d4bc497b4f321d39cb6463432b0183ad14ed02))
* remove unused monthStart variable ([2f8fbee](https://github.com/krieger2501/nexo/commit/2f8fbee934819d02cc3465372ca05497a24ebe32))

## [0.4.0](https://github.com/krieger2501/nexo/compare/nexo-v0.3.2...nexo-v0.4.0) (2026-05-10)


### Features

* inline error banner on login page, loading state on provider buttons ([3e5310a](https://github.com/krieger2501/nexo/commit/3e5310adb30e5d9b6ce7d1c1e307aceee384a587))


### Bug Fixes

* pass PUBLIC_FINANCE_URL and PUBLIC_APP_VERSION as runtime env to landing ([00e04e8](https://github.com/krieger2501/nexo/commit/00e04e8f0f3c10747fb76bdc58e4e1b47cfc9a4f))
* remove --remove-orphans from preview deploy command ([d216241](https://github.com/krieger2501/nexo/commit/d216241da10e088962967121ff01e4d54fc7613a))

## [0.3.2](https://github.com/krieger2501/nexo/compare/nexo-v0.3.1...nexo-v0.3.2) (2026-05-10)


### Bug Fixes

* derive FINANCE_VERSION from tag name instead of node on server ([8f20df7](https://github.com/krieger2501/nexo/commit/8f20df7f3936b00e9d604640b45879a2bbb897c0))

## [0.3.1](https://github.com/krieger2501/nexo/compare/nexo-v0.3.0...nexo-v0.3.1) (2026-05-10)


### Bug Fixes

* remove export \$(cat .env | xargs) from deploy script ([6f46fbb](https://github.com/krieger2501/nexo/commit/6f46fbbc4c0b1e22caf22a4744343e827e0e6642))

## [0.3.0](https://github.com/krieger2501/nexo/compare/nexo-v0.2.0...nexo-v0.3.0) (2026-05-10)


### Features

* add logger utility to auth and finance apps ([9cab61a](https://github.com/krieger2501/nexo/commit/9cab61a22b9eced4a060b2483c513a231097d85a))


### Bug Fixes

* cross-subdomain cookies + structured logging for auth flow ([121f105](https://github.com/krieger2501/nexo/commit/121f105bdd224f95328dd7aad0fda560eb38924c))
* pass finance version as build arg to landing, read from env at runtime ([c0a65fa](https://github.com/krieger2501/nexo/commit/c0a65fa6d9aff378987d5fe18b3b6fe7dba0fa48))

## [0.2.0](https://github.com/krieger2501/nexo/compare/nexo-v0.1.0...nexo-v0.2.0) (2026-05-08)


### Features

* initial commit ([e8dd4c9](https://github.com/krieger2501/nexo/commit/e8dd4c907e1cf5b545c52c01582c5b95b734c636))


### Bug Fixes

* add missing PUBLIC_AUTH_URL build ARG to auth/finance, fix migrate Dockerfile ([c806218](https://github.com/krieger2501/nexo/commit/c8062186813aa3fce8f63d8259fa69c94e0523a4))
* add non-null assertions to required env vars in auth ([5c3c96d](https://github.com/krieger2501/nexo/commit/5c3c96df8b674e445e092100cafb0a62aacae4d2))
* add pnpm-lock.yaml to all Dockerfiles for frozen install ([b58a00d](https://github.com/krieger2501/nexo/commit/b58a00deec7f5466934bd732880b7dccdb19cdb6))
* copy vite.shared.ts into Docker build context ([99f53af](https://github.com/krieger2501/nexo/commit/99f53afc2bfc657d1479467b47adf1573fbcc2fc))
* correct OAuth login flow, CSRF, and URL protocol in Docker ([ab43deb](https://github.com/krieger2501/nexo/commit/ab43deba17c3406532da43afb3fd057e9bb318e2))
* correct pnpm filter names to @nexo/* in Dockerfiles ([0c630aa](https://github.com/krieger2501/nexo/commit/0c630aa2244d4914fadf4fb466d44f7c3dc11a77))
* gitignore docker-compose.override.yml so local dev overrides never reach server ([2afc295](https://github.com/krieger2501/nexo/commit/2afc295d83528a00a39dce4a609d1f9a17e84ce1))
* inline root tsconfig into bot to fix Docker build (no extends across copy boundary) ([0d8ecc4](https://github.com/krieger2501/nexo/commit/0d8ecc4aeea17258b63e12d466c18f079db51ea9))
* install prod dependencies in bot runtime stage (same pattern as auth/finance) ([73ceebf](https://github.com/krieger2501/nexo/commit/73ceebff5dc41ab6d0059a0129e404985fe89ef4))
* non-null DATABASE_URL + dynamic/public for PUBLIC_APP_VERSION in finance ([91ed291](https://github.com/krieger2501/nexo/commit/91ed29181e066e2e602a1e7596618dcc24e0331e))
* proper SvelteKit env module usage with .env.build declaration files ([1442bb9](https://github.com/krieger2501/nexo/commit/1442bb9ed2c7ec95a13818697236e554b58edba9))
* replace SvelteKit env module imports with process.env for server-only secrets ([99adb53](https://github.com/krieger2501/nexo/commit/99adb53112d8f3f870cb262af9a78ea28df37a83))
* resolve all pnpm qc failures ([d9e9aed](https://github.com/krieger2501/nexo/commit/d9e9aeda888cca3a91bc73385668a870ec497da2))
* run svelte-kit sync before knip in SvelteKit apps to generate $types in CI ([9c487e8](https://github.com/krieger2501/nexo/commit/9c487e8b94c11fc3430717439ffe976869d55c45))
* switch landing PUBLIC_FINANCE_URL to dynamic/public env ([e89732c](https://github.com/krieger2501/nexo/commit/e89732c89910962f5795341d1ee0afc7e8502553))
* switch private/runtime env vars to dynamic, keep only PUBLIC_APP_VERSION as static ([9d2d6d7](https://github.com/krieger2501/nexo/commit/9d2d6d740a2d72ebd6c22b81e05497211b91f308))
* write PUBLIC_* vars to .env before vite build (SvelteKit static/public requires .env or process.env) ([70ca346](https://github.com/krieger2501/nexo/commit/70ca3468ebf1ba9f3101fc9afaefa29fee090639))
