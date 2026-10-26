# AGENTS.md

## Project Overview
This repository now uses a small Vite React scaffold with the main application implemented in [`src/app/App.jsx`](./src/app/App.jsx). The app behaves like a configurable financial reporting hub with report viewing, report setup, data import, access control, and export/print flows.

## Backend Location
- The Carmen API used by this frontend is at `C:\dotnet\Carmen4\Carmen.WebApi`. Check and change its `Controllers/ReportV2Controller.cs`, `Functions/FncReportV2.cs`, and BI migration scripts for report API work.

## Stack
- React function components
- JSX
- React hooks such as `useState`, `useMemo`, and `useEffect`
- Vite project structure with `src/main.jsx` and `src/app/App.jsx`
- UI split into reusable components under `src/features/report/components/`
- Shared defaults live in `src/features/report/data/`
- Persistence helpers live in `src/hooks/`
- Tailwind CSS utility classes for styling
- `lucide-react` icons
- Browser-native APIs including `localStorage`, `FileReader`, `Blob`, and `window.print()`

## Key App Behaviors
- `VIEW` mode renders a scrollable, zoomable financial report table.
- `SETUP` mode lets admins edit report metadata, themes, periods, rows, and columns.
- Role simulation supports switching between Admin and non-Admin users.
- Report visibility is filtered by assigned users.
- GL CSV uploads update master data and feed the report engine.
- Budget CSV uploads update budget data and feed the report engine.
- OCR/image/PDF import can generate a report template from uploaded content.
- Reports can be created blank, cloned, or deleted with confirmation.
- Row and column configurators support ordering, formulas, percent bases, and reference renumbering.
- Detail mapping supports departments, account codes, and group selection.
- Reports can be exported to Excel-compatible output and printed from the browser.
- Master data and report definitions persist in `localStorage`.
- Report themes can be switched per report.

## Working Rules
- Prefer preserving the existing business-logic implementation unless a refactor is explicitly requested.
- Prefer extending the existing component split instead of growing `src/app/App.jsx` further.
- Be careful when editing report row or column logic because formula references and renumbering are tightly coupled.
- Avoid changing import/export behavior unless the task specifically asks for it.
- Keep UI changes consistent with the current BI/dashboard styling.
- Keep motion subtle and purposeful: login entrance effects, shell tab transitions, and modal/sheet transitions are acceptable, but avoid animating the report table or other dense data surfaces.
- Respect reduced-motion preferences whenever adding new animations or transitions.

## Codex Usage Efficiency

Minimize unnecessary token and quota consumption while preserving correctness.

- Use targeted searches instead of scanning the entire repository.
- Do not repeatedly read files already inspected unless they changed or additional context is required.
- Reuse information already discovered during the current task.
- Avoid exploring unrelated files or expanding task scope without a clear reason.
- Do not inspect generated files, build outputs, node_modules, or large logs unless required.
- Batch related edits before running validation.
- Do not run build, lint, typecheck, or tests after every small edit.
- Prefer the smallest relevant test or validation command.
- Run broader validation only after the implementation is substantially complete.
- For large tasks, divide work into small logical phases.
- Before starting a task likely to require broad repository exploration or many iterations, provide a short plan first.
- Complete only the requested scope. Do not proactively refactor or improve unrelated code.
- Stop after the requested task and necessary validation are complete.

## Verification Checklist

Apply only the checks relevant to the files or behavior changed by the current task.

- For VIEW/SETUP changes: confirm the affected mode loads correctly.
- For GL import changes: confirm GL CSV upload updates master data and report output.
- For Budget import changes: confirm Budget CSV upload updates report output.
- For OCR import changes: confirm OCR import creates a report template.
- For report management changes: confirm affected create/clone/delete/access behavior.
- For export/print changes: confirm the affected output remains usable.
- For persistence changes: confirm relevant localStorage state survives reload.

## Excel Import Guardrails (confirmed with Ohm, 2026-10-05)
- Preserve Excel import behavior during unrelated UI changes. Do not reset imported row types, formulas, mappings, or multiline column labels.
- In the Daily Revenue workbook's `DRR REVENUE` sheet, `Total Room Revenue` is a Formula/Total row (`isTotal: true`, `isHeader: false`), not Data. Convert `SUM(C6:C8)` to `R2+R3+R4` in the default imported order. Resolve worksheet references against the actual imported row positions, including after import range changes. Preserve subtotal and Grand Total formulas as well.
- Formula/Total rows use the report theme's Total styling. Preserve this classification through setup, save, reload, and view.
- Imported column labels use real newline characters, never ` · ` separators. The first revenue label is `TODAY\nActual`; preserve corresponding `M-T-D` and `Y-T-D` labels.
- Currency, exchange-rate, and date metadata above the table must not enter column labels (`EXCHANGE RATE`, `DATE:`, and the report date are not header levels). Preserve genuine merged period groups above a Description heading in other templates.
- Keep regression coverage in `src/features/report/lib/excelTemplateImport.test.js` and `excelTemplateImport.fixtures.test.js`. When changing import, column-label rendering, row-type handling, or shared setup/view behavior, run those tests plus `src/features/report/lib/reportLogic.test.js` and `src/features/report/components/ReportView.test.jsx`.
- Do not weaken or remove these expectations to accommodate a UI redesign; a requested change in import behavior must be explicit.

<!-- ASTRYX:START -->
Astryx v0.1.9 · 153 components
CLI: run every command as `bunx astryx <cmd>` (shown below as `astryx ...`).

SETUP (once, in your app entry e.g. main.tsx) — without these, components render unstyled:
  import "@astryxdesign/core/reset.css";
  import "@astryxdesign/core/astryx.css";

WORKFLOW — discover, don't guess. Before writing UI:
1. `astryx build "<idea>"` — START HERE: returns a kit (closest [page] + [block]s + [component]s). No args = full playbook.
2. `astryx template <name> [--skeleton]` — scaffold the [page]/[block]s it named, or study their layout. Templates are reference code.
3. `astryx component <Name>` — props + examples for every component you use.

RULES:
- No <div> — components do all layout/spacing. Full page → AppShell; sidebar nav → SideNav.
- Frame first: pick the shell (AppShell / Layout+LayoutPanel) and budget regions in px BEFORE writing content (`astryx docs layout`).
- Dense data = rows (Table, List/Item) edge-to-edge — never Card-wrapped list items. Card = dashboard widgets, galleries, settings groups only.
- Status → StatusDot/Token; Badge only for counts and enumerated states, never decoration.
- Custom styling: component props first; else Tailwind utilities backed by tokens (bg-surface, text-primary, rounded-lg) via tailwind-theme.css. No raw hex/px.
- Tokens for every value (`astryx docs tokens`). Brand/accent via `astryx theme` — never override --color-* in :root.
- SELF-CHECK before you finish: re-read the file and replace any style={{…}}, raw <div>/<span> layout, imported .css/@apply, or hardcoded/arbitrary value (e.g. bg-[#fff], p-[13px]) with the component or a token-backed utility. If unsure a component/prop exists, run `astryx component <Name>` / `astryx search "<thing>"`; don't hand-roll CSS.

MORE CLI:
  search "<query>"   find any component / hook / doc / template / block
  component --list   153 components by category
  template --list    page + block recipes
  docs <topic>       color, elevation, icons, illustrations, internationalization, layout, migration, motion, principles, shape, spacing, styling, theme, tokens, typography
  swizzle <Name>     eject component source for deep customization
  upgrade --apply    run after any @astryxdesign/core bump
<!-- ASTRYX:END -->
