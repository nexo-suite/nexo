# Changelog

## [0.5.0](https://github.com/nexo-suite/nexo/compare/landing-v0.4.0...landing-v0.5.0) (2026-05-20)


### Features

* **landing:** polish apps directory, sessions sheet, structured healthz ([94aa9b7](https://github.com/nexo-suite/nexo/commit/94aa9b7ad54bc7f9fdca88db880120eaaac5e124))

## [0.4.0](https://github.com/krieger2501/nexo/compare/landing-v0.3.0...landing-v0.4.0) (2026-05-19)


### Features

* **flaschen:** add Flaschenpost shift-offer notifier app ([e35a981](https://github.com/krieger2501/nexo/commit/e35a981bb99429d7e7ad1cd2a8ecaa6aa040091e))
* **infra:** add /healthz endpoints to all apps ([7888d90](https://github.com/krieger2501/nexo/commit/7888d905901eaabc25d1ab0668edec24e56a9d41))
* **profile:** integrate profile hub on finance + landing ([8fe465c](https://github.com/krieger2501/nexo/commit/8fe465cde675ffdadab56f267090ce967756841d))


### Bug Fixes

* **infra:** set CI=true in Dockerfiles for pnpm v11 ([9724a0f](https://github.com/krieger2501/nexo/commit/9724a0f5f1cfccb8d296400da3084ec8528570ca))

## [0.3.0](https://github.com/krieger2501/nexo/compare/landing-v0.2.0...landing-v0.3.0) (2026-05-19)


### Features

* **security:** add CSP, HSTS, and Permissions-Policy headers ([6d165f1](https://github.com/krieger2501/nexo/commit/6d165f1e98588d0ad631993a9ae316964ed2e5eb))


### Bug Fixes

* **finance,landing:** mobile bottom-nav polish + i18n WIP hints ([bad2732](https://github.com/krieger2501/nexo/commit/bad2732bf056c2d349c806fc9c31ce6fd55a5398))
* **security:** enforce CSP via directives, drop reportOnly ([3c82060](https://github.com/krieger2501/nexo/commit/3c820605f86459afbf098867aba40f93d603aa0d))
* **security:** require origin on CSRF + show real OAuth consent ([b0c96de](https://github.com/krieger2501/nexo/commit/b0c96de30c1882dc1a2373f10bfc09b0c87997be))
* **security:** stop leaking session tokens to client ([42edbe3](https://github.com/krieger2501/nexo/commit/42edbe321579b4826437f8af17ab89d167cd60fa))

## [0.2.0](https://github.com/krieger2501/nexo/compare/landing-v0.1.0...landing-v0.2.0) (2026-05-18)


### Features

* add admin PWA + i18n infrastructure with paraglide.js ([0ce79d0](https://github.com/krieger2501/nexo/commit/0ce79d064939575beca34e200c9acd24b8ba790d))
* admin services panel, Loki/Grafana observability, correlation IDs ([bea0336](https://github.com/krieger2501/nexo/commit/bea033679f80cac0d4487f24a2b7dad900fd4e67))
* framework best practices — security headers, preload, nav progress, error pages ([c83f1ae](https://github.com/krieger2501/nexo/commit/c83f1ae80aa4d19a7574a98b0c30093234215c51))
* **i18n:** wire up paraglide messages in auth, landing, admin, finance ([8ea1512](https://github.com/krieger2501/nexo/commit/8ea151282203dbb673c1ea685918163f00bfefa3))
* initial commit ([e8dd4c9](https://github.com/krieger2501/nexo/commit/e8dd4c907e1cf5b545c52c01582c5b95b734c636))
* **landing:** add auth-aware /apps route with personalized tiles ([c83b2b7](https://github.com/krieger2501/nexo/commit/c83b2b7ccb64dea96b951a09b42ea3a815fdaa28))
* **landing:** session management, AppGrid extraction, save bar upgrade ([4bd3b35](https://github.com/krieger2501/nexo/commit/4bd3b356e97a2fed900c647946f8d06eecc4142d))
* transactional emails, app icons, and admin access UX ([9bd360b](https://github.com/krieger2501/nexo/commit/9bd360b9d983cb41009fb5ea51c06d3604247eae))


### Bug Fixes

* add pnpm-lock.yaml to all Dockerfiles for frozen install ([b58a00d](https://github.com/krieger2501/nexo/commit/b58a00deec7f5466934bd732880b7dccdb19cdb6))
* auth .well-known handlers pass event.request; update docs and CI pipeline ([2dd9557](https://github.com/krieger2501/nexo/commit/2dd955751e40497c55d3963286fa9905b8358d6c))
* copy vite.shared.ts into Docker build context ([99f53af](https://github.com/krieger2501/nexo/commit/99f53afc2bfc657d1479467b47adf1573fbcc2fc))
* correct OAuth login flow, CSRF, and URL protocol in Docker ([ab43deb](https://github.com/krieger2501/nexo/commit/ab43deba17c3406532da43afb3fd057e9bb318e2))
* correct pnpm filter names to @nexo/* in Dockerfiles ([0c630aa](https://github.com/krieger2501/nexo/commit/0c630aa2244d4914fadf4fb466d44f7c3dc11a77))
* explicit paraglide compile step, bot Dockerfile, clean paraglide output ([4146e0d](https://github.com/krieger2501/nexo/commit/4146e0d35c940bc005e9d0cf00c0cbb927f035ee))
* **landing:** copy sibling app package.json files for version reads in Docker build ([cbf9ce7](https://github.com/krieger2501/nexo/commit/cbf9ce7158a5651e54ea023bd8cfb71331edaf4f))
* **landing:** drop unused PUBLIC_APP_VERSION load ([eca87a4](https://github.com/krieger2501/nexo/commit/eca87a4e4a9e8103239469866b16f13eeb241e7b))
* non-null DATABASE_URL + dynamic/public for PUBLIC_APP_VERSION in finance ([91ed291](https://github.com/krieger2501/nexo/commit/91ed29181e066e2e602a1e7596618dcc24e0331e))
* pass finance version as build arg to landing, read from env at runtime ([c0a65fa](https://github.com/krieger2501/nexo/commit/c0a65fa6d9aff378987d5fe18b3b6fe7dba0fa48))
* resolve all pnpm qc failures ([d9e9aed](https://github.com/krieger2501/nexo/commit/d9e9aeda888cca3a91bc73385668a870ec497da2))
* run svelte-kit sync before knip in SvelteKit apps to generate $types in CI ([9c487e8](https://github.com/krieger2501/nexo/commit/9c487e8b94c11fc3430717439ffe976869d55c45))
* switch landing PUBLIC_FINANCE_URL to dynamic/public env ([e89732c](https://github.com/krieger2501/nexo/commit/e89732c89910962f5795341d1ee0afc7e8502553))
* **ui:** export Svelte components from source, drop svelte-package build ([02034ed](https://github.com/krieger2501/nexo/commit/02034edf31832e581622369670b287ac21873aba))
* write PUBLIC_* vars to .env before vite build (SvelteKit static/public requires .env or process.env) ([70ca346](https://github.com/krieger2501/nexo/commit/70ca3468ebf1ba9f3101fc9afaefa29fee090639))
