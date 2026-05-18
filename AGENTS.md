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

## Verification Checklist
- Confirm the app loads in both `VIEW` and `SETUP` modes through the Vite entrypoint.
- Confirm GL CSV upload updates master data and report output.
- Confirm Budget CSV upload updates report output.
- Confirm OCR import creates a report template.
- Confirm report cloning, blank creation, deletion, and access management still work.
- Confirm Excel export and browser print still produce usable output.
- Confirm `localStorage` persistence survives a reload.
