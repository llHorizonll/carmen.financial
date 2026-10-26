# CLAUDE.md

This file guides Claude Code in this repository. The shared agent rules live in AGENTS.md and are imported below. Follow them, including the Excel Import Guardrails and the Astryx block.

@AGENTS.md

## What this is

Carmen Blue Financial Report: a React 19 + Vite 8 SPA, served under `/financial/`. Finance staff use it to view, configure, import, export and print financial reports. Reports and master data now come from the **Carmen API** (backend at `C:\dotnet\Carmen4\Carmen.WebApi`, see AGENTS.md). Plain JavaScript/JSX with no TypeScript. The `@/` alias points to `src/`.

Note: README.md (in Thai) and parts of AGENTS.md describe an older version, in which localStorage was the database and data came from CSV. The current code is the source of truth.

## Commands

The package manager is **bun** (`packageManager: bun@1.3.9`, `bun.lock`). A `package-lock.json` also exists, and `npm run *` also works.

- `bun run dev`: Vite dev server. Requests to `/Carmen.Api2` are proxied to `https://dev.carmen4.com`.
- `bun run test`: `vitest run` (jsdom, setup in `src/test/setup.js`).
- Single file: `bunx vitest run src/features/report/lib/reportLogic.test.js`
- Single test: `bunx vitest run <file> -t "<test name>"`
- `bun run build`: vite build, then `scripts/copy-production-config.mjs`, then `prerender-login.mjs` (SSR-prerenders `LoginShell` into `dist/index.html`), then `critical-css.mjs`.
- `bun run perf:audit` / `perf:audit:quick` / `perf:bundle`: Lighthouse and bundle audits.
- React Doctor lint is configured in `doctor.config.json` (`bunx react-doctor`).

## Architecture

- **Entry**: `src/main.jsx` loads the Astryx CSS, calls `initializeTheme()` and renders `ConnectivityFeedback > LoginShell`. It hydrates when prerendered markup is present, so keep `LoginShell` SSR-safe and guard `window` and `localStorage` access.
- **Runtime config**: `index.html` loads `config.js` before the bundle, which sets `window.__CARMEN_CONFIG__` (`apiUrl`, `adminToken`, `env`). The dev copy is `public/config.js` (localhost Carmen.WebApi). Production uses `config/production/config.js`, which is copied into `dist/`. `config/runtimeConfig.test.js` asserts both.
- **Auth/session**: `src/features/report/lib/carmenSession.js` stores the token, user, business unit, language (`en`/`th`) and BU selection in `localStorage` under `carmen_*` keys. It emits `carmen-session-changed` and `carmen-language-changed` window events.
- **API layer**: `src/features/report/lib/reportApi.js` holds all `fetch` calls (login, tenants, report-options, dimensions, users, account/department groups, report-periods, reports CRUD and history/restore). Errors are dispatched as `carmen-api-error` events, and `components/system/ConnectivityFeedback*` surfaces them.
- **Adapters**: `reportAdapters.js` converts API payloads into app shapes (`adaptCarmen*`) and derives the financial report permissions. Access checks live in `src/app/reportAccess.js` (`permissions.financialReport.{view,setup,add,update,delete}`, falling back to `role === "Admin"`).
- **Calculation engine**: `reportLogic.js`. Pass 1 aggregates GL/budget values by account, department, group and resolved periods. Pass 2 evaluates column/row formulas (`C1+C2`, `R1+R2`) and percent-mix bases. Row and column renumbering is coupled to formula references.
- **Excel import**: `excelTemplateImport.js` (uses `xlsx`), the wizard UI in `ExcelTemplateImportWizard.jsx`, and fixtures in `test-fixtures/`.
- **App shell**: `src/app/App.jsx` (~108 KB) owns most of the state and flow. Put new UI in `src/features/report/components/` and not in App.jsx.
- **UI kits**: Astryx (`@astryxdesign/core`, which is preferred for new UI per the AGENTS.md block) alongside the shadcn/Radix primitives in `src/components/ui/`, Tailwind v4 via `@tailwindcss/vite`, tokens in `src/index.css` and the theme logic in `src/lib/theme.js`.
- **i18n**: `src/lib/i18n.js` uses English source strings as keys with a `thai` dictionary. Use `useTranslation()` and `t('English text', { var })`. When you add user-facing strings, add the Thai entries too.

## Testing notes

- Tests sit next to their sources (`*.test.js[x]`). `App.test.jsx` is large and does integration-style testing.
- The setup file mocks `localStorage`, `matchMedia`, `ResizeObserver` and `scrollIntoView`, and clears storage before each test.
- Follow AGENTS.md: run the smallest relevant test file first, and run the full suite only once the work is substantially complete.

## Housekeeping

- The repo root collects ad-hoc `*.log` files from past build and test runs (these are gitignored). Don't read them unless asked, and send new logs to a scratch location.
- Ignore `dist/`, `node_modules/`, `.tmp*`, `.codex-tmp/`, `.vite/` and `graft/` unless the task involves them.
- Specs and plans live in `docs/superpowers/` and performance notes in `docs/performance/`. The FRD (`FRD - Financial BI App v5.24.docx`) is the functional spec.
