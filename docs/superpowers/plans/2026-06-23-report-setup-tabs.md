# Report Setup Tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add reusable local setup tabs so `ReportSetup` switches between `ColumnsConfigurator` and `RowsConfigurator`, while refreshing configurator headers with stronger visual styling and a per-column eye toggle.

**Architecture:** Keep all report logic and data ownership where it already lives. Add one small presentational tabs helper local to report setup, keep tab state in `ReportSetup.jsx`, and make the configurator updates UI-only by reusing existing handlers such as `handleUpdateCol`, `handleAddCol`, and `handleAddRow`.

**Tech Stack:** React 19 function components, JSX, Vitest, Testing Library, Tailwind CSS 4 utilities, `lucide-react`, existing shadcn/ui primitives

---

## File Structure

### Files to Create

- `src/features/report/components/SetupSectionTabs.jsx`
  - Small local tab strip for setup sub-sections.
- `src/features/report/components/ReportSetup.test.jsx`
  - Covers default active tab and switching between configurators.

### Files to Modify

- `src/features/report/components/ReportSetup.jsx`
  - Owns active setup tab state and swaps stacked configurators for tabbed content.
- `src/features/report/components/ColumnsConfigurator.jsx`
  - Adds eye toggle near delete, header action color styling, and improved scroll shell.
- `src/features/report/components/RowsConfigurator.jsx`
  - Applies matching header action color styling and mild shell alignment.
- `src/features/report/components/ColumnsConfigurator.test.jsx`
  - Covers eye toggle and preserves current behavior.

### Files to Verify But Not Necessarily Change

- `src/features/report/components/RowsConfigurator.test.jsx`
  - Make sure styling-oriented changes do not break current row interactions.

---

### Task 1: Add setup-local tabs and switch ReportSetup to one active configurator

**Files:**
- Create: `src/features/report/components/SetupSectionTabs.jsx`
- Create: `src/features/report/components/ReportSetup.test.jsx`
- Modify: `src/features/report/components/ReportSetup.jsx`

- [ ] **Step 1: Write the failing test for default tab and switching**

```jsx
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ReportSetup from './ReportSetup.jsx';

vi.mock('./ReportDetailsPanel.jsx', () => ({
  default: () => <div>Report Details Panel</div>,
}));

vi.mock('./ColumnsConfigurator.jsx', () => ({
  default: () => <div>Columns Configurator Content</div>,
}));

vi.mock('./RowsConfigurator.jsx', () => ({
  default: () => <div>Rows Configurator Content</div>,
}));

describe('ReportSetup', () => {
  it('shows columns by default and switches to rows on tab click', () => {
    render(
      <ReportSetup
        activeReport={{
          theme: 'blue',
          columns: [{ id: 'C1', isActive: true }],
          rows: [{ id: 'R1' }],
        }}
        activeCategories={['I']}
        reportOptions={{ themes: [{ id: 'blue', label: 'Classic Blue' }] }}
      />
    );

    expect(screen.getByText('Columns Configurator Content')).toBeInTheDocument();
    expect(screen.queryByText('Rows Configurator Content')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Rows/i }));

    expect(screen.getByText('Rows Configurator Content')).toBeInTheDocument();
    expect(screen.queryByText('Columns Configurator Content')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- ReportSetup.test.jsx`

Expected: FAIL because `ReportSetup.jsx` still renders both configurators and the tab buttons do not exist yet.

- [ ] **Step 3: Add the local tabs helper**

Create `src/features/report/components/SetupSectionTabs.jsx`:

```jsx
import React from 'react';
import { cn } from '@/lib/utils.js';

export default function SetupSectionTabs({
  items,
  activeKey,
  onChange,
  className = '',
}) {
  return (
    <div
      className={cn(
        'inline-flex w-full flex-wrap items-center gap-1 rounded-2xl border border-border bg-muted/40 p-1',
        className,
      )}
      role="tablist"
      aria-label="Setup section tabs"
    >
      {items.map((item) => {
        const isActive = item.key === activeKey;
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={item.panelId}
            id={item.tabId}
            onClick={() => onChange(item.key)}
            className={cn(
              'inline-flex min-h-9 flex-1 items-center justify-center rounded-xl px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-background text-foreground shadow-sm ring-1 ring-border/60'
                : 'text-muted-foreground hover:bg-background/70 hover:text-foreground',
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Update ReportSetup to use local tab state**

Update `src/features/report/components/ReportSetup.jsx`:

```jsx
import React, { useState } from 'react';
import { cn } from '@/lib/utils.js';
import { Badge } from '@/components/ui/badge.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import ReportDetailsPanel from './ReportDetailsPanel.jsx';
import ColumnsConfigurator from './ColumnsConfigurator.jsx';
import RowsConfigurator from './RowsConfigurator.jsx';
import SetupSectionTabs from './SetupSectionTabs.jsx';
import { THEMES } from '../lib/reportLogic.js';

export default function ReportSetup(props) {
  const [activeSetupSection, setActiveSetupSection] = useState('columns');
  const activeColumns =
    props.activeReport?.columns?.filter((column) => column?.isActive !== false)
      .length || 0;
  const activeRows = props.activeReport?.rows?.length || 0;
  const activeCategoryCount = props.activeCategories?.length || 0;
  const themeOptions =
    props.reportOptions?.themes?.length > 0
      ? props.reportOptions.themes
      : [
          { id: 'blue', label: 'Classic Blue' },
          { id: 'green', label: 'Emerald Green' },
          { id: 'gray', label: 'Slate Gray' },
        ];
  const activeThemeId = props.activeReport?.theme || 'blue';
  const activeTheme =
    themeOptions.find((option) => option.id === activeThemeId) || null;
  const themeBadgeClassMap = {
    blue: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/40 dark:bg-blue-950/45 dark:text-blue-100',
    green:
      'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/45 dark:text-emerald-100',
    gray: 'border-slate-200 bg-slate-100 text-slate-800 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-100',
  };
  const themeBadgeClass = themeBadgeClassMap[activeThemeId] || themeBadgeClassMap.blue;
  const themeBadgeLabel = activeTheme?.label || THEMES[activeThemeId]?.name || activeThemeId;

  const setupTabs = [
    {
      key: 'columns',
      label: `Columns (${activeColumns})`,
      tabId: 'report-setup-tab-columns',
      panelId: 'report-setup-panel-columns',
    },
    {
      key: 'rows',
      label: `Rows (${activeRows})`,
      tabId: 'report-setup-tab-rows',
      panelId: 'report-setup-panel-rows',
    },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-5 overflow-y-auto pb-8 pr-2">
      {/* existing hero card stays as-is */}
      <ReportDetailsPanel {...props} />

      <div className="grid gap-4">
        <SetupSectionTabs
          items={setupTabs}
          activeKey={activeSetupSection}
          onChange={setActiveSetupSection}
        />

        {activeSetupSection === 'columns' ? (
          <section
            id="report-setup-panel-columns"
            role="tabpanel"
            aria-labelledby="report-setup-tab-columns"
          >
            <ColumnsConfigurator {...props} />
          </section>
        ) : (
          <section
            id="report-setup-panel-rows"
            role="tabpanel"
            aria-labelledby="report-setup-tab-rows"
          >
            <RowsConfigurator {...props} />
          </section>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- ReportSetup.test.jsx`

Expected: PASS with one test passing for default `Columns` view and switching to `Rows`.

- [ ] **Step 6: Commit**

```bash
git add src/features/report/components/SetupSectionTabs.jsx src/features/report/components/ReportSetup.jsx src/features/report/components/ReportSetup.test.jsx
git commit -m "feat: add setup tabs for report configurators"
```

### Task 2: Add the column eye toggle and preserve existing column behavior

**Files:**
- Modify: `src/features/report/components/ColumnsConfigurator.jsx`
- Modify: `src/features/report/components/ColumnsConfigurator.test.jsx`

- [ ] **Step 1: Write the failing test for the eye toggle**

Update `src/features/report/components/ColumnsConfigurator.test.jsx`:

```jsx
it('toggles column visibility from the eye action', async () => {
  const handleAddCol = vi.fn();
  const handleUpdateCol = vi.fn();
  const moveCol = vi.fn();
  const handleDeleteCol = vi.fn();

  render(
    <ColumnsConfigurator
      activeReport={{
        columns: [
          { id: 'C1', label: 'Actual', isActive: true, type: 'AC', yearMode: 'current', periodMode: 'current', width: '' },
        ],
      }}
      handleAddCol={handleAddCol}
      handleUpdateCol={handleUpdateCol}
      moveCol={moveCol}
      handleDeleteCol={handleDeleteCol}
    />
  );

  fireEvent.click(screen.getByRole('button', { name: /Hide column C1/i }));
  expect(handleUpdateCol).toHaveBeenCalledWith('C1', 'isActive', false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- ColumnsConfigurator.test.jsx`

Expected: FAIL because the eye action is not rendered yet.

- [ ] **Step 3: Add the eye toggle beside delete using existing `isActive`**

Update `src/features/report/components/ColumnsConfigurator.jsx` imports and row actions:

```jsx
import React from 'react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, Percent, Trash2 } from 'lucide-react';

// inside the row render:
<TableCell className="px-2 py-2 align-middle">
  <div className="flex items-center justify-center gap-1.5">
    <Button
      variant="outline"
      size="icon-sm"
      className={
        col.isActive !== false
          ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-100'
          : 'border-border bg-background text-muted-foreground hover:bg-muted'
      }
      aria-label={`${col.isActive !== false ? 'Hide' : 'Show'} column ${col.id}`}
      title={`${col.isActive !== false ? 'Hide' : 'Show'} column ${col.id}`}
      onClick={() =>
        handleUpdateCol(col.id, 'isActive', !(col.isActive !== false))
      }
    >
      {col.isActive !== false ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
    </Button>
    <Button
      variant="destructive"
      size="icon-sm"
      className="border-destructive/30 bg-destructive/10 text-destructive hover:border-destructive/40 hover:bg-destructive/20"
      aria-label={`Delete column ${col.id}`}
      title={`Delete column ${col.id}`}
      onClick={() => handleDeleteCol(col.id)}
    >
      <Trash2 className="text-destructive" />
    </Button>
  </div>
</TableCell>
```

- [ ] **Step 4: Adjust the existing test expectations for the new button order**

Update the row action assertions in `src/features/report/components/ColumnsConfigurator.test.jsx`:

```jsx
const rowButtons = within(row).getAllByRole('button');

fireEvent.click(rowButtons[0]);
expect(handleUpdateCol).toHaveBeenCalledWith('C1', 'isActive', false);

fireEvent.click(rowButtons[1]);
expect(handleDeleteCol).toHaveBeenCalledWith('C1');

fireEvent.click(rowButtons[2]);
expect(moveCol).toHaveBeenCalledWith(0, 'left');

fireEvent.click(rowButtons[3]);
expect(moveCol).toHaveBeenCalledWith(0, 'right');
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- ColumnsConfigurator.test.jsx`

Expected: PASS with the new eye action covered and existing column interactions still green.

- [ ] **Step 6: Commit**

```bash
git add src/features/report/components/ColumnsConfigurator.jsx src/features/report/components/ColumnsConfigurator.test.jsx
git commit -m "feat: add column visibility eye toggle"
```

### Task 3: Refresh the columns configurator shell and header action styling

**Files:**
- Modify: `src/features/report/components/ColumnsConfigurator.jsx`

- [ ] **Step 1: Write a small failing assertion for the refreshed header actions**

Add to `src/features/report/components/ColumnsConfigurator.test.jsx`:

```jsx
expect(screen.getByRole('button', { name: '+ Data' }).className).toMatch(/bg-blue|border-blue|text-blue/);
expect(screen.getByRole('button', { name: '+ Formula' }).className).toMatch(/bg-violet|border-violet|text-violet|bg-slate|border-slate|text-slate/);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- ColumnsConfigurator.test.jsx`

Expected: FAIL because the header buttons still use plain outline styling.

- [ ] **Step 3: Apply restrained semantic button styling and a clearer scroll shell**

Update `src/features/report/components/ColumnsConfigurator.jsx`:

```jsx
const headerActionClassName =
  'w-full justify-center rounded-xl border shadow-sm transition-colors';
const addActionClassName =
  'border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-100';
const formulaActionClassName =
  'border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';
const percentActionClassName =
  'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-100';

<Card className="min-h-0 overflow-hidden border border-border bg-card/95 shadow-none ring-0">
  <CardHeader className="border-b bg-muted/20 pb-5">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="space-y-1.5">
        <CardTitle className="text-base font-semibold tracking-tight text-foreground">
          Columns Configurator
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Set column types, formulas, percentages, and widths.
        </CardDescription>
      </div>
      <div className="grid gap-2 sm:grid-cols-3 lg:min-w-96">
        <Button variant="outline" size="sm" className={`${headerActionClassName} ${addActionClassName}`} onClick={() => handleAddCol('data')}>
          + Data
        </Button>
        <Button variant="outline" size="sm" className={`${headerActionClassName} ${formulaActionClassName}`} onClick={() => handleAddCol('formula')}>
          + Formula
        </Button>
        <Button variant="outline" size="sm" className={`${headerActionClassName} ${percentActionClassName}`} onClick={() => handleAddCol('percent')}>
          <Percent />
          Mix %
        </Button>
      </div>
    </div>
  </CardHeader>

  <CardContent className="p-0">
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-0 right-0 z-20 hidden w-10 bg-gradient-to-l from-background via-background/80 to-transparent md:block" />
      <div className="overflow-x-auto overflow-y-hidden">
        <Table className="min-w-[1200px]">
          {/* existing table content */}
        </Table>
      </div>
    </div>
  </CardContent>
</Card>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- ColumnsConfigurator.test.jsx`

Expected: PASS with the new button class assertions and existing behavior still passing.

- [ ] **Step 5: Commit**

```bash
git add src/features/report/components/ColumnsConfigurator.jsx src/features/report/components/ColumnsConfigurator.test.jsx
git commit -m "style: refresh columns configurator shell"
```

### Task 4: Bring row configurator header actions in line with the new pattern

**Files:**
- Modify: `src/features/report/components/RowsConfigurator.jsx`
- Verify: `src/features/report/components/RowsConfigurator.test.jsx`

- [ ] **Step 1: Add a small styling assertion for row header actions**

Add to `src/features/report/components/RowsConfigurator.test.jsx`:

```jsx
expect(screen.getByRole('button', { name: '+ Add Data Row' }).className).toMatch(/bg-blue|border-blue|text-blue/);
expect(screen.getByRole('button', { name: '+ Add Formula Row' }).className).toMatch(/bg-slate|border-slate|text-slate|bg-violet|border-violet|text-violet/);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- RowsConfigurator.test.jsx`

Expected: FAIL because the row header buttons still use plain outline styling.

- [ ] **Step 3: Apply the same restrained action styling to row header buttons**

Update `src/features/report/components/RowsConfigurator.jsx`:

```jsx
const headerActionClassName =
  'w-full justify-center rounded-xl border shadow-sm transition-colors';
const addActionClassName =
  'border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-100';
const headerRowActionClassName =
  'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-100';
const formulaActionClassName =
  'border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';

<Card className="min-h-0 overflow-hidden border border-border bg-card/95 shadow-none ring-0">
  <CardHeader className="border-b bg-muted/20 pb-5">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="space-y-1.5">
        {/* existing title and description */}
      </div>
      <div className="grid gap-2 sm:grid-cols-3 lg:min-w-96">
        <Button variant="outline" size="sm" className={`${headerActionClassName} ${addActionClassName}`} onClick={() => handleAddRow('data')}>
          + Add Data Row
        </Button>
        <Button variant="outline" size="sm" className={`${headerActionClassName} ${headerRowActionClassName}`} onClick={() => handleAddRow('header')}>
          + Add Header Row
        </Button>
        <Button variant="outline" size="sm" className={`${headerActionClassName} ${formulaActionClassName}`} onClick={() => handleAddRow('formula')}>
          + Add Formula Row
        </Button>
      </div>
    </div>
  </CardHeader>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- RowsConfigurator.test.jsx`

Expected: PASS with row interactions still green and the new styling assertions satisfied.

- [ ] **Step 5: Commit**

```bash
git add src/features/report/components/RowsConfigurator.jsx src/features/report/components/RowsConfigurator.test.jsx
git commit -m "style: align rows configurator header actions"
```

### Task 5: Run the focused verification set and do a final UI smoke pass

**Files:**
- No new files

- [ ] **Step 1: Run the focused component tests**

Run: `npm test -- ReportSetup.test.jsx ColumnsConfigurator.test.jsx RowsConfigurator.test.jsx`

Expected: PASS with all three targeted component tests green.

- [ ] **Step 2: Run the production build**

Run: `npm run build`

Expected: PASS with a successful Vite production build and no JSX/class-name regressions.

- [ ] **Step 3: Manual smoke-check the setup screen**

Run: `npm run dev`

Check in the browser:

```text
1. Open SETUP mode.
2. Confirm Report Details remains visible above the configurator area.
3. Confirm Columns tab is selected by default.
4. Switch to Rows and back to Columns.
5. In Columns, click the eye icon and confirm the column active state toggles.
6. Confirm horizontal overflow still works and the right-edge fade hints at more columns.
7. Confirm colored header actions read clearly in both current theme modes.
```

- [ ] **Step 4: Commit**

```bash
git add src/features/report/components/ReportSetup.jsx src/features/report/components/SetupSectionTabs.jsx src/features/report/components/ReportSetup.test.jsx src/features/report/components/ColumnsConfigurator.jsx src/features/report/components/ColumnsConfigurator.test.jsx src/features/report/components/RowsConfigurator.jsx src/features/report/components/RowsConfigurator.test.jsx
git commit -m "feat: tab report setup configurators"
```

## Self-Review

### Spec coverage

- Local reusable tabs: covered in Task 1.
- `Columns` / `Rows` switching under setup: covered in Task 1.
- Stronger columns shell and scroll cue: covered in Task 3.
- Eye icon near delete: covered in Task 2.
- Colored header actions in both configurators: covered in Tasks 3 and 4.
- Preserve existing logic and handlers: maintained throughout by only reusing current props and parent-owned state.

### Placeholder scan

- No `TODO` or `TBD` placeholders remain.
- Every code-changing step includes concrete code or commands.

### Type consistency

- Active setup section keys are consistently `columns` and `rows`.
- Column visibility continues to use `isActive`.
- Existing handler names stay `handleAddCol`, `handleUpdateCol`, `handleAddRow`, and `handleUpdateRow`.
