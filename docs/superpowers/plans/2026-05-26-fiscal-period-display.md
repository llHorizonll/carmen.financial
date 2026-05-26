# Fiscal Period Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make period resolution and header labels respect fiscal period metadata from the Carmen API instead of assuming calendar month order.

**Architecture:** Extend the report engine so period resolution can use the loaded API period sequence when available, while preserving the current numeric fallback when metadata is missing. Keep the display label logic in `App.jsx` aligned with the same metadata so the UI and calculation path stay consistent.

**Tech Stack:** React, Vitest, JSX, shared report engine helpers in `src/features/report/lib/`, Carmen API adapter data from `src/features/report/lib/reportAdapters.js`

---

### Task 1: Add a regression test for fiscal-period-aware resolution

**Files:**
- Modify: `src/features/report/lib/reportLogic.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
it('resolves current and previous periods using fiscal metadata order when available', () => {
  const periods = [
    { id: '10', periodNo: 10, dateLabel: 'Period 10' },
    { id: '20', periodNo: 20, dateLabel: 'Period 20' },
    { id: '30', periodNo: 30, dateLabel: 'Period 30' },
  ];

  expect(resolveTime({ yearMode: 'current', periodMode: 'current' }, '2026', '20', periods)).toEqual({
    effYear: '2026',
    targetMonths: [2],
  });

  expect(resolveTime({ yearMode: 'current', periodMode: '-1' }, '2026', '10', periods)).toEqual({
    effYear: '2025',
    targetMonths: [3],
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/report/lib/reportLogic.test.js -t "resolves current and previous periods using fiscal metadata order when available"`
Expected: FAIL because `resolveTime` still ignores the `periods` metadata argument.

- [ ] **Step 3: Write minimal implementation**

Implement `resolveTime(col, appliedYear, appliedPeriod, periodOptions = [])` so it maps the selected period and relative period modes using the provided fiscal sequence before falling back to the existing month-number behavior.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/features/report/lib/reportLogic.test.js -t "resolves current and previous periods using fiscal metadata order when available"`
Expected: PASS.

### Task 2: Thread period metadata through the app report engine path

**Files:**
- Modify: `src/app/App.jsx`
- Modify: `src/features/report/lib/reportLogic.js`

- [ ] **Step 1: Write the failing test**

```javascript
it('builds report data using fiscal period metadata when resolving period windows', () => {
  const report = {
    category: ['ALL'],
    rows: [
      { id: 'r1', desc: 'Revenue', isActive: true, isHeader: false, isTotal: false, dept: '', groupLevel: 'L4', groups: 'FOO', accCodes: '4001', percentBase: '', formula: '', indent: 0 },
    ],
    columns: [
      { id: 'C1', label: 'Actual', isActive: true, isFormula: false, isPercent: false, yearMode: 'current', periodMode: '-1', type: 'AC', width: '' },
    ],
  };

  const result = buildReportData({
    activeReport: report,
    engineData: [
      { year: '2026', deptcode: '101', acccode: '4001', accnature: 'I', group4: 'FOO', amt1: '10', amt2: '20', amt3: '30' },
    ],
    budgetData: [],
    appliedDepts: [],
    appliedYear: '2026',
    appliedPeriod: '20',
    appliedRevision: '0',
    periodOptions: [
      { id: '10', periodNo: 10 },
      { id: '20', periodNo: 20 },
      { id: '30', periodNo: 30 },
    ],
    masterData: INITIAL_MASTER_DATA,
  });

  expect(result[0].results.C1).toBe(10);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/report/lib/reportLogic.test.js -t "builds report data using fiscal period metadata when resolving period windows"`
Expected: FAIL because `buildReportData` does not yet use `periodOptions`.

- [ ] **Step 3: Write minimal implementation**

Pass `periodOptions` from `App.jsx` into `buildReportData`, and use the metadata-aware `resolveTime` output inside the aggregation helpers.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/features/report/lib/reportLogic.test.js -t "builds report data using fiscal period metadata when resolving period windows"`
Expected: PASS.

### Task 3: Verify full suite

**Files:**
- No new file changes expected

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: All tests pass with no new regressions.

