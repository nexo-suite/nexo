# Changelog

## [0.2.0](https://github.com/krieger2501/nexo/compare/db-v0.1.0...db-v0.2.0) (2026-05-18)


### Features

* add admin panel app at admin.krieger2501.de ([956fa23](https://github.com/krieger2501/nexo/commit/956fa233cef7f70a4dd8f450da605a12a79ffb1f))
* add admin PWA + i18n infrastructure with paraglide.js ([0ce79d0](https://github.com/krieger2501/nexo/commit/0ce79d064939575beca34e200c9acd24b8ba790d))
* admin services panel, Loki/Grafana observability, correlation IDs ([bea0336](https://github.com/krieger2501/nexo/commit/bea033679f80cac0d4487f24a2b7dad900fd4e67))
* **db:** add session names JSONB column, new migrations 0005-0008 ([c4f103f](https://github.com/krieger2501/nexo/commit/c4f103f562c5a5ee2e599d8b3f7e637bf0af17e8))
* **finance:** commitments page with fund allocation and grouped nav ([618db40](https://github.com/krieger2501/nexo/commit/618db40b878b877719a2b6f7e7364d7905277422))
* initial commit ([e8dd4c9](https://github.com/krieger2501/nexo/commit/e8dd4c907e1cf5b545c52c01582c5b95b734c636))


### Bug Fixes

* add missing PUBLIC_AUTH_URL build ARG to auth/finance, fix migrate Dockerfile ([c806218](https://github.com/krieger2501/nexo/commit/c8062186813aa3fce8f63d8259fa69c94e0523a4))
* add pnpm-lock.yaml to all Dockerfiles for frozen install ([b58a00d](https://github.com/krieger2501/nexo/commit/b58a00deec7f5466934bd732880b7dccdb19cdb6))
* auth .well-known handlers pass event.request; update docs and CI pipeline ([2dd9557](https://github.com/krieger2501/nexo/commit/2dd955751e40497c55d3963286fa9905b8358d6c))
* correct pnpm filter names to @nexo/* in Dockerfiles ([0c630aa](https://github.com/krieger2501/nexo/commit/0c630aa2244d4914fadf4fb466d44f7c3dc11a77))
* resolve all pnpm qc failures ([d9e9aed](https://github.com/krieger2501/nexo/commit/d9e9aeda888cca3a91bc73385668a870ec497da2))
