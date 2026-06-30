# Astryx Shell Redesign

## Goal

Apply Astryx design conventions to the Carmen Financial BI app without disturbing business logic, starting with a shell-first redesign for login, app framing, filters, and setup surfaces.

Ship this in two phases:

- Phase 1: Astryx shell-first redesign for login, app header, report framing, filters, actions, and full-width setup workspace cards.
- Phase 2: Astryx styling pass for setup-mode row and column tables so the editing surfaces feel like part of the same workspace.

## Current State

- `src/app/LoginShell.jsx` already has a polished login screen, but it still reads more like a launch page than a secure finance workspace.
- `src/app/App.jsx` contains most of the shell layout and mixes report framing, status badges, action controls, and setup/report switching in one large surface.
- `ReportSetup.jsx`, `ReportDetailsPanel.jsx`, `RowsConfigurator.jsx`, `ColumnsConfigurator.jsx`, and `SetupSectionTabs.jsx` already split the setup experience into components, but the visual system is still closer to a general Tailwind dashboard than an Astryx-led workspace.
- `ReportView.jsx` is functionally correct and should not be deeply reworked in this pass because dense financial tables are coupled to existing report behavior and print/export expectations.

## Recommended Approach

Use a shell-first redesign that keeps the current React structure and handlers intact:

- Add Astryx base CSS in the Vite entrypoint so Astryx components and tokens can style correctly.
- Reframe login as a secure workspace entry, not a marketing hero.
- Rebuild the app shell into an executive-ledger layout:
  - calmer neutral palette
  - slimmer chrome
  - stronger hierarchy around report identity and system status
  - grouped controls instead of scattered toolbars
- Convert setup mode into a full-width workspace with section cards and clearer content bands.
- Keep the report table mostly intact in `VIEW` mode, limiting changes to framing, surrounding controls, and spacing.
- Follow with a second setup-only table styling phase once the shell language is established.

This is the highest-value, lowest-risk Astryx adoption path because it touches the surfaces users live in most without destabilizing report logic.

## Alternatives Considered

### 1. Recommended: shell-first Astryx adoption

- Biggest visual improvement per line changed.
- Preserves fragile report logic and dense data behavior.
- Creates a clean base for a later setup-table pass.

### 2. Shell-first plus aggressive component replacement

- Stronger Astryx consistency immediately.
- Higher regression risk because setup components would be reshaped too broadly in one pass.

### 3. Full app conversion including deep report table changes

- Most complete thematic change.
- Too risky for this app because the report view, setup tables, print output, and formula editing are tightly coupled and already working.

## UX Direction

### Visual Tone

Approved direction: `Executive ledger`.

- Calm, formal, premium finance workspace.
- Neutral theme bias with restrained accent use.
- Dense but not cramped.
- Motion remains subtle and only on shell transitions, entrances, and overlays.
- Avoid decorative flourish that competes with reporting content.

### Login Experience

- Shift the page from a product-pitch feel to a secure workspace entry.
- Keep the business-unit and language workflow intact.
- Reduce the promotional feel of the left column.
- Use stronger credential and tenancy hierarchy with quieter supporting copy.
- Preserve field validation, loading, and error messaging behavior.

### Main Shell

- Establish a top-led shell with clearer report identity, role context, and sync/system status.
- Keep `VIEW` and `SETUP` as the primary mode switch.
- Group filter controls into a deliberate control band rather than a loose row of widgets.
- Group report actions such as GL sync, budget sync, export, and print into a compact action cluster.
- Keep table zoom in `VIEW` mode but make it feel like part of the shell instead of a bolt-on strip.

### Setup Workspace

- Approved direction: full-width workspace with section cards.
- Setup should feel like a structured editor, not a long stack of generic dashboard cards.
- Each major setup area should read as its own workspace section:
  - report details
  - access
  - import/template actions
  - columns
  - rows
- Use short helper text and clear section headers so occasional admins understand where to work.
- Keep the new `Columns`/`Rows` local tab pattern and align it to the new shell instead of replacing it.

### Phase 2 Setup-Table Pass

- The setup tables for rows and columns should become Astryx-style editing surfaces.
- Keep the underlying editing model and handlers intact.
- Improve:
  - header band clarity
  - tabular typography
  - row and column identity emphasis
  - action-cell consistency
  - inline warning visibility for broken references and invalid formulas
  - calmer zebra rhythm and spacing
- This phase is presentation-first and should not alter formula, reference, mapping, or persistence behavior.

## Component Design

### Entry and Global Styling

- Update `src/main.jsx` to import Astryx base styles:
  - `@astryxdesign/core/reset.css`
  - `@astryxdesign/core/astryx.css`
- Update `src/index.css` to align the app token usage with Astryx-friendly neutral surfaces while keeping existing theme plumbing and print rules intact.
- Prefer Astryx-native controls where there is a direct semantic match, not a one-component-fits-all replacement rule.
- Expected control mapping:
  - text entry -> `TextInput` or `TextArea`
  - single-value selection -> `Selector`, `SegmentedControl`, or `RadioList` depending on option count and visibility needs
  - multi-value selection -> `MultiSelector` for longer searchable lists, `CheckboxList` for short always-visible groups
  - single boolean setting -> `CheckboxInput` or `Switch`
  - labeled validation wrapper -> `Field`
- `MultiSelector` should be used only where users truly select multiple items from a finite list, such as departments, assigned users, or similar multi-filter surfaces.

### LoginShell

- Keep existing auth flow and API calls.
- Rework the composition so the screen feels more like a sign-in desk for a finance workspace.
- Preserve reduced-motion behavior.
- Keep current form fields, business-unit loading, and inline validation.

### App Shell

- `src/app/App.jsx` remains the stateful shell.
- Reduce visual clutter by consolidating shell framing and extracting repeated visual sections only if the extractions are obvious and small.
- Prefer reuse of existing components over new abstractions.
- Keep mode switching, loading states, badges, and toolbar actions functionally unchanged.

### Setup Components

- `ReportSetup.jsx` becomes the orchestrator for a clearer full-width workspace.
- `ReportDetailsPanel.jsx`, `ColumnsConfigurator.jsx`, `RowsConfigurator.jsx`, and `SetupSectionTabs.jsx` receive the main visual pass.
- Keep prop contracts and handler signatures unchanged where possible.
- Avoid new global component systems for this pass. Use the smallest local reshaping that delivers the Astryx language.
- Replace existing shadcn-style inputs opportunistically where Astryx provides a good semantic match and the swap is low-risk.
- Do not force every existing control into `MultiSelector`; each field should use the Astryx component that matches its behavior.

### Report View

- `ReportView.jsx` stays behaviorally and structurally close to current state.
- Only adjust the outer card/frame, title treatment, supporting labels, and spacing so it sits naturally in the new shell.
- Do not redesign the report table in this phase.

## State and Data Flow

- No report schema changes.
- No API contract changes.
- No localStorage key changes.
- No change to formula parsing, row/column renumbering, access checks, OCR import, GL/Budget import, print, or export behavior.
- Any new state introduced should be presentational only.

## Error Handling

- Keep current inline validation and alerts.
- Do not hide broken-reference or incompatible-column warnings behind collapsed UI.
- Preserve accessibility basics:
  - visible focus states
  - readable contrast
  - reduced-motion handling
  - explicit labels for interactive controls

## Testing

Minimum verification after implementation:

- App loads through the Vite entrypoint with Astryx CSS applied.
- Login still supports username, password, business-unit loading, language selection, and failure states.
- `VIEW` and `SETUP` mode switching still works.
- Report filters still apply.
- GL and budget sync/import actions still fire through existing controls.
- Export to Excel and browser print remain available and usable.
- Setup sections still render and existing add/update/move/delete actions remain reachable.
- Row and column configurators still preserve formulas, references, and warnings.

## Out of Scope

- Rewriting report calculation logic
- Replacing the report table in `VIEW` mode
- Changing import/export workflows
- Changing print layout rules beyond necessary shell compatibility
- Introducing a new app-wide abstraction layer just to mirror Astryx naming
- Deep Phase 2 setup-table implementation in the same pass as Phase 1

## Implementation Notes

- Start with the shell and setup framing, not the dense tables.
- Prefer the shortest diff that establishes the new visual system.
- Reuse the current component split under `src/features/report/components/` instead of growing `App.jsx`.
- Let Astryx guide layout and tone, but do not force an all-`div` purge or large-scale markup rewrites where current components already express the needed structure.
- Favor exact Astryx component matches over generic wrappers:
  - `MultiSelector` for multi-pick filters
  - `Selector` for single dropdowns
  - `CheckboxInput` for lone toggles
  - `CheckboxList` for short visible groups
  - `Field` for labels, descriptions, and validation framing
- If replacing a control would raise regression risk without meaningful visual gain, keep the current logic and style it to the same Astryx language instead.
- After Phase 1 lands cleanly, use the same visual language to style the setup tables in Phase 2.
