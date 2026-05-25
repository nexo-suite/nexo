# Changelog

## [0.5.0](https://github.com/nexo-suite/nexo/compare/bot-v0.4.0...bot-v0.5.0) (2026-05-25)


### Features

* **bot:** enable calorie unstable previews ([4ccde88](https://github.com/nexo-suite/nexo/commit/4ccde8886f56dacdd71875aafd686f874db0f2cd))
* modernize toolchain + calorie app + admin redesign + observability ([9ae85a6](https://github.com/nexo-suite/nexo/commit/9ae85a61b08d2ff8f62d0ba6568ef4dee9dfd1bf))

## [0.4.0](https://github.com/nexo-suite/nexo/compare/bot-v0.3.0...bot-v0.4.0) (2026-05-23)


### Features

* **bot:** persistent state machine + single-comment UX ([5279901](https://github.com/nexo-suite/nexo/commit/52799010664efe3a81bed905d5dd78fbdba6926d))
* deploy/observability platform + landing apps polish ([5c12105](https://github.com/nexo-suite/nexo/commit/5c12105cce5f297fa28690ea07c307ead8354114))

## [0.3.0](https://github.com/nexo-suite/nexo/compare/bot-v0.2.1...bot-v0.3.0) (2026-05-21)


### Features

* **bot:** split webhook deploy into comments and state modules ([a2148ca](https://github.com/nexo-suite/nexo/commit/a2148ca6674a6369efa1d8727d88480ef9f91446))


### Bug Fixes

* **infra:** switch Docker installs from --offline to --prefer-offline ([8dbd86b](https://github.com/nexo-suite/nexo/commit/8dbd86baef9501c117dfa2320ccda4f11f7fa0f9))

## [0.2.1](https://github.com/krieger2501/nexo/compare/bot-v0.2.0...bot-v0.2.1) (2026-05-19)


### Bug Fixes

* **infra:** set CI=true in Dockerfiles for pnpm v11 ([9724a0f](https://github.com/krieger2501/nexo/commit/9724a0f5f1cfccb8d296400da3084ec8528570ca))

## [0.2.0](https://github.com/krieger2501/nexo/compare/bot-v0.1.0...bot-v0.2.0) (2026-05-18)


### Features

* admin services panel, Loki/Grafana observability, correlation IDs ([bea0336](https://github.com/krieger2501/nexo/commit/bea033679f80cac0d4487f24a2b7dad900fd4e67))
* **bot:** add structured logging, fix double-deploy race, fix deprecated API version ([6896491](https://github.com/krieger2501/nexo/commit/68964915ecc8ce7a40db3707fe13aba77e503e42))
* initial commit ([e8dd4c9](https://github.com/krieger2501/nexo/commit/e8dd4c907e1cf5b545c52c01582c5b95b734c636))


### Bug Fixes

* add pnpm-lock.yaml to all Dockerfiles for frozen install ([b58a00d](https://github.com/krieger2501/nexo/commit/b58a00deec7f5466934bd732880b7dccdb19cdb6))
* auth .well-known handlers pass event.request; update docs and CI pipeline ([2dd9557](https://github.com/krieger2501/nexo/commit/2dd955751e40497c55d3963286fa9905b8358d6c))
* **bot:** skip comment if one already exists on PR open ([0accd34](https://github.com/krieger2501/nexo/commit/0accd349ab4697d91d3bcea7b48d9e2691eddef1))
* **bot:** stale comment only after deploy, keep checkbox checked while deploying, derive state from comment body ([a4ae2a4](https://github.com/krieger2501/nexo/commit/a4ae2a41031568abeb7f547e9a55edcc34cae986))
* correct OAuth login flow, CSRF, and URL protocol in Docker ([ab43deb](https://github.com/krieger2501/nexo/commit/ab43deba17c3406532da43afb3fd057e9bb318e2))
* explicit paraglide compile step, bot Dockerfile, clean paraglide output ([4146e0d](https://github.com/krieger2501/nexo/commit/4146e0d35c940bc005e9d0cf00c0cbb927f035ee))
* inline root tsconfig into bot to fix Docker build (no extends across copy boundary) ([0d8ecc4](https://github.com/krieger2501/nexo/commit/0d8ecc4aeea17258b63e12d466c18f079db51ea9))
* install prod dependencies in bot runtime stage (same pattern as auth/finance) ([73ceebf](https://github.com/krieger2501/nexo/commit/73ceebff5dc41ab6d0059a0129e404985fe89ef4))
* resolve lint and knip CI failures ([67b721d](https://github.com/krieger2501/nexo/commit/67b721de9ea4bf5019fde6f88ce25fc0bc2b72c0))
