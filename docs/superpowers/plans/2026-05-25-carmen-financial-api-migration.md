# Carmen Financial API Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the financial BI frontend to the local Carmen WebApi contract in `http://localhost/Carmen.WebApi/swagger`, while keeping localStorage as a fallback cache and preserving report setup/view behavior.

**Architecture:** Keep `src/features/report/lib/reportApi.js` as the single API facade for auth, master data, report options, report periods, report data, and report-definition CRUD. Normalize backend DTOs in `reportAdapters.js` so the app continues to consume the current report shape. Keep `src/app/App.jsx` focused on orchestration: load API data, choose between API and cached data, and trigger report CRUD and refresh flows.

**Tech Stack:** React, Vite, `fetch`, `localStorage`, Vitest, WebApi DTOs from `C:\dotnet\Carmen4\Carmen.WebApi`.

---

### Task 1: Lock the frontend to the local WebApi defaults

**Files:**
- Modify: `public/config.js`
- Modify: `src/features/report/lib/reportApi.js`
- Test: `src/features/report/lib/reportAdapters.test.js`

- [ ] **Step 1: Write the failing test**

```js
import { expect, it, describe } from 'vitest';
import { getCarmenApiConfig } from './reportApi.js';

describe('getCarmenApiConfig', () => {
  it('uses local Carmen WebApi defaults when window config is missing', () => {
    expect(getCarmenApiConfig()).toEqual({
      baseUrl: 'http://localhost/Carmen.WebApi',
      adminToken: '<admin-token>',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/features/report/lib/reportAdapters.test.js`
Expected: FAIL because the default base URL still points at the remote dev API or the test file does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```js
const DEFAULT_BASE_URL = 'http://localhost/Carmen.WebApi';
export const getCarmenApiConfig = () => {
  const config = getWindowConfig();
  return {
    baseUrl: config?.apiUrl || DEFAULT_BASE_URL,
    adminToken: config?.adminToken || '',
  };
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/features/report/lib/reportAdapters.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add public/config.js src/features/report/lib/reportApi.js src/features/report/lib/reportAdapters.test.js
git commit -m "feat: point BI frontend at local Carmen WebApi"
```

### Task 2: Normalize the backend DTOs into the existing frontend report shape

**Files:**
- Modify: `src/features/report/lib/reportAdapters.js`
- Test: `src/features/report/lib/reportAdapters.test.js`

- [ ] **Step 1: Write the failing test**

```js
import { expect, it, describe } from 'vitest';
import {
  adaptCarmenBudgetRevisions,
  adaptCarmenCompany,
  adaptCarmenDepartments,
  adaptCarmenGlPeriods,
  adaptCarmenLoginUser,
} from './reportAdapters.js';

describe('Carmen adapters', () => {
  it('maps the local WebApi master-data DTOs into the app shape', () => {
    expect(adaptCarmenCompany({ name: 'Local Hotel' })).toEqual({ name: 'Local Hotel' });
    expect(adaptCarmenDepartments({ depts: [{ id: '101', label: 'Rooms' }] })).toEqual([
      { id: '101', name: 'Rooms' },
    ]);
    expect(adaptCarmenGlPeriods({ periods: [{ id: '1', label: 'P1', month: 1, date: '2026-01-01' }] })).toEqual([
      expect.objectContaining({ id: '1', label: 'P1', periodNo: 1, date: '2026-01-01' }),
    ]);
    expect(adaptCarmenBudgetRevisions({ budgetRevisions: [{ id: '0', label: 'Rev 0' }] })).toEqual([
      { id: '0', label: 'Rev 0' },
    ]);
  });

  it('maps login permissions into app access flags', () => {
    expect(adaptCarmenLoginUser({
      UserId: 'u1',
      UserName: 'admin',
      Tenant: 'carmencloud',
      Permissions: [{ Name: 'GL.FinancialReport', View: true, Add: true, Update: false, Delete: false }],
    })).toEqual(expect.objectContaining({
      role: 'Admin',
      permissions: {
        financialReport: expect.objectContaining({ view: true, setup: true, add: true }),
      },
    }));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/features/report/lib/reportAdapters.test.js`
Expected: FAIL on at least one DTO shape mismatch before the adapter is updated.

- [ ] **Step 3: Write minimal implementation**

```js
export const adaptCarmenDepartments = (departments) =>
  toArray(departments)
    .filter((dept) => dept?.DeptCode || dept?.id)
    .map((dept) => ({
      id: normalizeDeptLookupCode(dept.DeptCode || dept.id),
      name: dept.Description || dept.label || dept.name || `Dept ${dept.DeptCode || dept.id}`,
    }));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/features/report/lib/reportAdapters.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/report/lib/reportAdapters.js src/features/report/lib/reportAdapters.test.js
git commit -m "feat: normalize Carmen report DTO adapters"
```

### Task 3: Add report-definition CRUD and report-data fetch helpers

**Files:**
- Modify: `src/features/report/lib/reportApi.js`
- Test: `src/features/report/lib/reportApi.test.js`

- [ ] **Step 1: Write the failing test**

```js
import { expect, it, describe } from 'vitest';
import { buildReportDefinitionPayload } from './reportApi.js';

describe('buildReportDefinitionPayload', () => {
  it('keeps the frontend report shape when preparing a save payload', () => {
    expect(buildReportDefinitionPayload({
      id: 'rep-1',
      name: 'Report',
      companyName: 'Hotel',
      category: ['ALL'],
      assignedUsers: ['u1'],
      isActive: true,
      periodFormat: 'standard',
      customDateLabel: '',
      customPeriodLabel: '',
      theme: 'blue',
      columns: [],
      rows: [],
      access: [],
    })).toEqual(expect.objectContaining({
      id: 'rep-1',
      name: 'Report',
      companyName: 'Hotel',
      category: ['ALL'],
      assignedUsers: ['u1'],
    }));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/features/report/lib/reportApi.test.js`
Expected: FAIL because the helper does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```js
export const fetchCarmenReports = async () => requestCarmenJson('/api/reports');
export const saveCarmenReport = async (report) => requestCarmenJson(`/api/reports/${encodeURIComponent(report.id)}`, {
  method: 'PUT',
  body: buildReportDefinitionPayload(report),
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/features/report/lib/reportApi.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/report/lib/reportApi.js src/features/report/lib/reportApi.test.js
git commit -m "feat: add Carmen report CRUD helpers"
```

### Task 4: Switch app startup and refresh flows to the API with cached fallback

**Files:**
- Modify: `src/app/LoginShell.jsx`
- Modify: `src/app/App.jsx`
- Modify: `src/hooks/usePersistentState.js` only if cache handling needs a helper
- Test: `src/app/App.test.jsx` or existing app tests if they already cover startup

- [ ] **Step 1: Write the failing test**

```js
import { expect, it, describe } from 'vitest';
import { canViewFinancialReports } from '../app/App.jsx';

describe('permission gating', () => {
  it('allows API users with GL.FinancialReport.View to open VIEW mode', () => {
    expect(canViewFinancialReports({
      permissions: { financialReport: { view: true, setup: false, add: false, update: false, delete: false } },
    })).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test`
Expected: FAIL before the helper is exported or covered.

- [ ] **Step 3: Write minimal implementation**

```js
const [reports, setReports] = usePersistentState('carmen_bi_reports_config_v5_16', getDefaultReports);
useEffect(() => {
  if (!isCarmenApiConfigured()) return;
  // load master data and reports from API, then fall back to cached data on failure
}, []);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/LoginShell.jsx src/app/App.jsx src/hooks/usePersistentState.js src/features/report/lib/reportApi.js
git commit -m "feat: load BI app state from Carmen WebApi"
```

### Task 5: Verify the local WebApi contract end to end

**Files:**
- No source changes unless verification exposes a contract mismatch

- [ ] **Step 1: Run the focused test suite**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 2: Build the app**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Verify the app against the local backend**

Run the app with the local config and confirm:
`http://localhost/Carmen.WebApi/swagger` shows `api/login`, `api/report-master-data`, `api/report-options`, `api/report-periods`, `api/report-data`, and `api/reports`.

- [ ] **Step 4: Confirm frontend behavior**

Open the app, sign in with the local credentials, and confirm:
the master data loads from the API, report lists are populated, report refresh works without CSV upload, setup edits still work, and existing export/print behavior still works.

---
