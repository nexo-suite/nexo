# Changelog

## [0.8.0](https://github.com/nexo-suite/nexo/compare/admin-v0.7.0...admin-v0.8.0) (2026-05-25)


### Features

* modernize toolchain + calorie app + admin redesign + observability ([9ae85a6](https://github.com/nexo-suite/nexo/commit/9ae85a61b08d2ff8f62d0ba6568ef4dee9dfd1bf))

## [0.7.0](https://github.com/nexo-suite/nexo/compare/admin-v0.6.0...admin-v0.7.0) (2026-05-23)


### Features

* deploy/observability platform + landing apps polish ([5c12105](https://github.com/nexo-suite/nexo/commit/5c12105cce5f297fa28690ea07c307ead8354114))

## [0.6.0](https://github.com/nexo-suite/nexo/compare/admin-v0.5.2...admin-v0.6.0) (2026-05-22)


### Features

* **admin:** label-scoped healthz poller and surfacing ([67b58f1](https://github.com/nexo-suite/nexo/commit/67b58f1927c3085e2d7f677ae5a3831e86466a2b))

## [0.5.2](https://github.com/nexo-suite/nexo/compare/admin-v0.5.1...admin-v0.5.2) (2026-05-21)


### Bug Fixes

* **infra:** switch Docker installs from --offline to --prefer-offline ([8dbd86b](https://github.com/nexo-suite/nexo/commit/8dbd86baef9501c117dfa2320ccda4f11f7fa0f9))

## [0.5.1](https://github.com/nexo-suite/nexo/compare/admin-v0.5.0...admin-v0.5.1) (2026-05-21)


### Bug Fixes

* **admin:** grant docker socket group + log socket failures ([c2b3911](https://github.com/nexo-suite/nexo/commit/c2b3911c87395621dbc87501d312e89968e1a5fb))

## [0.5.0](https://github.com/nexo-suite/nexo/compare/admin-v0.4.0...admin-v0.5.0) (2026-05-20)


### Features

* **admin:** container health monitoring, push notifications, user avatar menu ([f09ccea](https://github.com/nexo-suite/nexo/commit/f09ccea288c41f71e7bce73d3c09eccb6f7aac3f))

## [0.4.0](https://github.com/krieger2501/nexo/compare/admin-v0.3.0...admin-v0.4.0) (2026-05-19)


### Features

* **flaschen:** add Flaschenpost shift-offer notifier app ([e35a981](https://github.com/krieger2501/nexo/commit/e35a981bb99429d7e7ad1cd2a8ecaa6aa040091e))
* **infra:** add /healthz endpoints to all apps ([7888d90](https://github.com/krieger2501/nexo/commit/7888d905901eaabc25d1ab0668edec24e56a9d41))


### Bug Fixes

* **infra:** set CI=true in Dockerfiles for pnpm v11 ([9724a0f](https://github.com/krieger2501/nexo/commit/9724a0f5f1cfccb8d296400da3084ec8528570ca))

## [0.3.0](https://github.com/krieger2501/nexo/compare/admin-v0.2.0...admin-v0.3.0) (2026-05-19)


### Features

* **security:** add CSP, HSTS, and Permissions-Policy headers ([6d165f1](https://github.com/krieger2501/nexo/commit/6d165f1e98588d0ad631993a9ae316964ed2e5eb))


### Bug Fixes

* **security:** enforce CSP via directives, drop reportOnly ([3c82060](https://github.com/krieger2501/nexo/commit/3c820605f86459afbf098867aba40f93d603aa0d))
* **security:** require origin on CSRF + show real OAuth consent ([b0c96de](https://github.com/krieger2501/nexo/commit/b0c96de30c1882dc1a2373f10bfc09b0c87997be))

## [0.2.0](https://github.com/krieger2501/nexo/compare/admin-v0.1.0...admin-v0.2.0) (2026-05-18)


### Features

* add admin panel app at admin.krieger2501.de ([956fa23](https://github.com/krieger2501/nexo/commit/956fa233cef7f70a4dd8f450da605a12a79ffb1f))
* add admin PWA + i18n infrastructure with paraglide.js ([0ce79d0](https://github.com/krieger2501/nexo/commit/0ce79d064939575beca34e200c9acd24b8ba790d))
* admin services panel, Loki/Grafana observability, correlation IDs ([bea0336](https://github.com/krieger2501/nexo/commit/bea033679f80cac0d4487f24a2b7dad900fd4e67))
* **admin:** app display labels, filter separator, add Gym + Pomodoro ([e68df41](https://github.com/krieger2501/nexo/commit/e68df41cddbf0081cd7f6fba7a89ce8ed7328e5a))
* **admin:** mobile-responsive layout with bottom tab bar ([b2ae4ae](https://github.com/krieger2501/nexo/commit/b2ae4ae078d33cfc35bf296913af8ebd9995eaad))
* **admin:** redesign log viewer — expandable rows, dynamic field picker, fix overscroll ([0cf05c7](https://github.com/krieger2501/nexo/commit/0cf05c79307725141bcfd6570d2950818a20ca15))
* **admin:** redesign user detail view + list filters ([8ed804d](https://github.com/krieger2501/nexo/commit/8ed804de42b411f80f6b43b5ffbaff11783b6caf))
* **admin:** v2 UI — component extraction, settings page, Dockerfile fix ([91edeb5](https://github.com/krieger2501/nexo/commit/91edeb5b152c9bfaa719804133054f48c4efee54))
* app access enforcement + admin UI polish ([de6580c](https://github.com/krieger2501/nexo/commit/de6580c8357ec533ed23e0f47e61a1675ab49782))
* draggable bottom sheet + admin PWA safe-area fixes ([39d10dc](https://github.com/krieger2501/nexo/commit/39d10dcde510d91f12a6458c2a98f232b50b13a9))
* framework best practices — security headers, preload, nav progress, error pages ([c83f1ae](https://github.com/krieger2501/nexo/commit/c83f1ae80aa4d19a7574a98b0c30093234215c51))
* grouped list filters + funny app access messages ([714d757](https://github.com/krieger2501/nexo/commit/714d7579e6874289b0fa3724dab0eaac6c2f0847))
* **i18n:** wire up paraglide messages in auth, landing, admin, finance ([8ea1512](https://github.com/krieger2501/nexo/commit/8ea151282203dbb673c1ea685918163f00bfefa3))
* iOS PWA polish — offline pages, update prompt, splash screen links ([9df11b0](https://github.com/krieger2501/nexo/commit/9df11b0a3bc8d29b3332d864a238f21e93366e27))
* personality system — blue admin theme, Konami code easter egg ([93d3cd6](https://github.com/krieger2501/nexo/commit/93d3cd62d15f7b6fab78a65c9b287e28082e84d5))
* transactional emails, app icons, and admin access UX ([9bd360b](https://github.com/krieger2501/nexo/commit/9bd360b9d983cb41009fb5ea51c06d3604247eae))


### Bug Fixes

* add missing eslint/knip/gitignore configs to admin app ([55b69db](https://github.com/krieger2501/nexo/commit/55b69dbc1f02b19636c7616b9f2619a9d207aca1))
* admin Dockerfile include @nexo/email, Caddy bot proxy, CI docker builds ([3531f28](https://github.com/krieger2501/nexo/commit/3531f28d46eeebb2a9468759a74a0608462e4050))
* **admin:** fix lint errors in log viewer — SvelteSet, each keys, button type ([8010f0a](https://github.com/krieger2501/nexo/commit/8010f0a5c46bd242378d8e30dc949e49f1beae7f))
* auth .well-known handlers pass event.request; update docs and CI pipeline ([2dd9557](https://github.com/krieger2501/nexo/commit/2dd955751e40497c55d3963286fa9905b8358d6c))
* auth no-zoom, app filter All chip, subtitle breakdown ([728c1dc](https://github.com/krieger2501/nexo/commit/728c1dc5e6082efa4434864f88e2c62094255e03))
* explicit paraglide compile step, bot Dockerfile, clean paraglide output ([4146e0d](https://github.com/krieger2501/nexo/commit/4146e0d35c940bc005e9d0cf00c0cbb927f035ee))
