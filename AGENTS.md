# AGENTS.md

## Project Overview
This repository now uses a small Vite React scaffold with the main application implemented in [`src/app/App.jsx`](./src/app/App.jsx). The app behaves like a configurable financial reporting hub with report viewing, report setup, data import, access control, and export/print flows.

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

## Verification Checklist
- Confirm the app loads in both `VIEW` and `SETUP` modes through the Vite entrypoint.
- Confirm GL CSV upload updates master data and report output.
- Confirm Budget CSV upload updates report output.
- Confirm OCR import creates a report template.
- Confirm report cloning, blank creation, deletion, and access management still work.
- Confirm Excel export and browser print still produce usable output.
- Confirm `localStorage` persistence survives a reload.

<!-- ASTRYX:START -->
Astryx v0.1.2 · 148 components
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
- Custom styling: component props first; else Tailwind utilities backed by tokens (bg-surface, text-primary, rounded-lg) via tailwind-theme.css. No raw hex/px.
- Tokens for every value (`astryx docs tokens`). Brand/accent via `astryx theme` — never override --color-* in :root.

MORE CLI:
  search "<query>"   find any component / hook / doc / template / block
  component --list   148 components by category
  template --list    page + block recipes
  docs <topic>       color, elevation, icons, illustrations, migration, motion, principles, shape, spacing, styling, theme, tokens, typography
  swizzle <Name>     eject component source (--gap reports why)
  upgrade --apply    run after any @astryxdesign/core bump
<!-- ASTRYX:END -->
