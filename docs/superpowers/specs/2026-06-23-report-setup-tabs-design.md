# Report Setup Tabs Design

## Goal

Shorten the setup screen when reports gain many columns or rows by introducing a reusable local tab pattern inside setup sections, starting with `Report Details` content split into `Columns` and `Rows`.

## Current State

- `src/features/report/components/ReportSetup.jsx` renders `ReportDetailsPanel`, then `ColumnsConfigurator`, then `RowsConfigurator` in one long vertical stack.
- `ColumnsConfigurator.jsx` already uses a horizontally scrollable table, but the card shell is plain and the rightward overflow is easy to miss.
- Adding many columns or rows creates a very tall setup canvas and makes repeated switching between the two configurators slow.

## Recommended Approach

Add a lightweight in-section tab shell to setup and use it first for the configurator area:

- Tab group label stays visually under the existing setup context.
- Two tabs: `Columns` and `Rows`.
- Only the active configurator renders.
- Existing add/update/move/delete logic stays unchanged.
- The tab shell is reusable for future setup sections, but only this first use ships now.

This is the smallest change that improves scanability and keeps the current business logic intact.

## Alternatives Considered

### 1. Keep the stacked layout and only restyle the cards

- Smallest visual diff.
- Does not solve the long-page problem after bulk adds.

### 2. Replace the table with horizontally scrolling column cards

- More visually dramatic.
- Worse for dense editing and riskier to implement.

### 3. Recommended: reusable local tabs plus a stronger table shell

- Solves the long-page issue.
- Keeps the current editing model.
- Gives us a pattern we can reuse later without overbuilding now.

## UX Design

### Setup Tab Pattern

- Render a compact tab bar above the configurator content.
- Match existing BI/dashboard styling:
  - muted background shell
  - rounded container
  - active tab with stronger fill and foreground contrast
  - inactive tabs with subdued text
- Show lightweight counts in labels when cheap to compute:
  - `Columns (n)`
  - `Rows (n)`
- Default tab: `Columns`, because column structure usually drives report framing first.
- Preserve selected tab while the user remains in setup mode during the session.
- No URL sync or persistence needed yet.

### Columns Configurator Refresh

- Keep the current table layout.
- Upgrade the outer card to feel more like the dashboard shell:
  - cleaner header grouping
  - tighter control alignment
  - stronger section framing
- Keep the table header sticky.
- Add a right-edge fade or shadow cue over the scroll area so users can tell more fields exist offscreen.
- Keep horizontal scrolling native; do not add custom drag logic.
- Keep the action buttons in the header.
- Do not pin columns yet unless the current table still feels hard to scan after the lighter refresh.

### Rows Configurator

- Leave row logic and structure intact.
- Only change its visibility through the new tabs.
- Minimal cosmetic alignment so it does not feel mismatched beside the refreshed columns card.

## Component Design

### New Reusable Piece

Add one small setup-local tab component or helper under `src/features/report/components/`:

- Purpose: render tab triggers and active panel shell for setup sections.
- Scope: local to report setup, not a new global design-system primitive.
- API should stay tiny:
  - tab items
  - active key
  - change handler

This avoids growing `ReportSetup.jsx` further while staying below the threshold of a general abstraction.

### ReportSetup Changes

- Keep hero card and `ReportDetailsPanel` unchanged.
- Replace the stacked configurator block with:
  - tab shell
  - active configurator panel
- Counts should come from the same values already computed in `ReportSetup.jsx`.

### ColumnsConfigurator Changes

- Rework the card header layout and scroll container styling only.
- Keep handler props and row rendering contract unchanged so existing tests stay relevant.

## State and Data Flow

- Add one local `useState` in `ReportSetup.jsx` for active setup tab.
- Values: `"columns"` and `"rows"`.
- This state is presentational only; no report data shape changes.
- No localStorage, API, or export/import changes.

## Error Handling

- Existing warnings in `ColumnsConfigurator` for incompatible types and broken references remain unchanged.
- Tab switching must not reset unsaved edits because edits already flow upward through existing handlers.

## Testing

Minimum checks:

- `ReportSetup` shows `Columns` by default.
- Switching to `Rows` hides columns content and shows row content.
- Switching back preserves ongoing edits because parent state still owns the data.
- `ColumnsConfigurator` still renders add buttons, warnings, and the horizontal table.

Prefer adding or updating a small component test around `ReportSetup` rather than rewriting configurator tests.

## Out of Scope

- Rebuilding configurators as cards
- Persisting selected setup tabs across reloads
- Refactoring report logic
- Changing import/export behavior
- Broader setup IA beyond the first reusable tab pattern

## Implementation Notes

- Follow the repo rule to preserve current report logic.
- Keep the diff focused on `ReportSetup.jsx`, `ColumnsConfigurator.jsx`, and a tiny new setup tab helper if needed.
- Reuse existing button/card styling patterns before adding anything new.
