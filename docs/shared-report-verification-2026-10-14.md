# Shared report verification — 2026-10-14

Scope: local Carmen Financial and Carmen.WebApi; DBX `dev`, read-only. Lifecycle writes used the authenticated application UI only, restricted to named verification templates. No migration, source financial data change, permission change or deployment was performed.

## Verified

- DBX information_schema confirms `bi_shared_report` and `bi_shared_report_history` exist in the Admin database. Both use InnoDB.
- All 11 columns match `App_Data/SharedReports/001-create-admin-shared-reports.sql`, including types, NOT NULL and primary keys. Primary keys are ReportId and (ReportId, Version), respectively.
- Both tables were empty at the initial schema check. The subsequent authenticated verification created a dedicated test template and a soft-deleted clone.
- Unauthenticated GET `http://localhost/Carmen.WebApi/api/shared-reports/capabilities` returns HTTP 401. This proves the unauthenticated request is rejected, not authenticated capability availability or serving assembly identity.
- Targeted shared frontend tests: 13 passed / 2 files.
- Full frontend regression suite: 280 passed / 33 files; `bun run test -- --maxWorkers=4 --testTimeout=15000`, 26.36 seconds. Existing Node localstorage-file warnings remain.

## Authenticated lifecycle and reconciliation

- Shared capability/catalog loaded successfully after Ohm signed in. Create, update, catalog reload, clone, history and soft-delete worked against the Admin database, independently checked through DBX.
- Original verification ID: `b34d721c9657442885f95b8d84a3b326`. Current name: `Verification 2026-10-14 Room Revenue Actual Budget`, version 7, two columns and one KPI. Keep it clearly identified as a verification configuration.
- Clone ID: `3ec222c384224985bd1b446566d6a563`; soft-deleted at version 2, with create/delete history retained.
- Restore of unmapped version 1 correctly returned `Mapping missing: carmencloud / Room Revenue.` No history/version mutation occurred. Restore of valid version 3 succeeded as version 5, then version 4 succeeded as version 6, preserving current access. Version 7 adds Budget.
- Ohm confirmed Rev 0 means the same scenario in CarmenCloud and paresa. No restricted-BU test account is available yet; authenticated deny/revoke remains pending.
- Actual/Budget verification uses 2026, P1, Rev0, all departments, no dimensions, source sign +1. CarmenCloud account `4010001`, paresa (`prod`) account `4100001`. Both are credit-nature Room Revenue accounts. API compatibility accepted THB and aligned fiscal ranges.

| Source | Actual P1 | Budget P1 Rev0 |
| --- | ---: | ---: |
| CarmenCloud | 4,327.10 | 1,000,000.00 |
| paresa | 26,384,410.66 | 27,123,525.00 |
| Combined | 26,388,737.76 | 28,123,525.00 |

Independent SQL aggregates: `SUM(Amt1)` from each tenant's VGlHis filtered by `PeriodYear=2026` and the mapped account; `SUM(Amt1)` from VBudget filtered by `Year=2026`, `Revision=0` and the mapped account. Actual source counts were 3 / 34, Budget counts 1 / 5. All per-BU and combined values match UI at display precision. KPI displays 26,388,737.76. This is one row/scenario, not full report acceptance or a frozen before/after dataset.

Downloaded `consolidated-report.xls` (1,551 bytes) contains both exact displayed totals, both BU names and Complete metadata. The browser download event timed out; the actual downloaded file was independently inspected in Downloads. Native Excel rendering and print output were not rechecked in this milestone.

## Shared workspace UI

- Shared reports now occupies main content inside the existing shell, with sidebar/account controls available. No outer dialog or backdrop. Mapping/confirmation dialogs remain contextual.
- Both workspaces stay mounted when hidden, preserving drafts when switching. App integration checks cover two selected BUs, paused background loading and unsaved single-BU draft; browser confirmed shared draft survives Back to reports and re-entry.
- Existing Astryx layout imports retained. Setup fieldsets have min-width zero for local table scrolling; headings/text use project foreground tokens. Narrow viewport check found no body horizontal overflow after containment fixes; viewport override reset afterward.
- Latest full suite after UI change: 280 passed / 33 files, 22.36 seconds. Required Excel import/fixtures/reportLogic/ReportView subset: 73 passed. App/shared subset: 46 passed. LoginShell: 6 passed.
- Frontend build passed; existing critical-css warning about locating `/financial/assets/...css` remains. React Doctor: 77/100, 13 warnings, no shared-workspace diagnostic. Earlier recorded score was 75/100, not a same-version scanner baseline.
- Screenshot: [workspace and actual KPI](shared-workspace-2026-10-14.png).

## Remaining release gates

1. ACL, cross-admin isolation, concurrent delete/restore conflicts and denied/revoked BU membership with controlled test accounts. Do not alter business-user permissions.
2. Broader financial acceptance: rows/formulas/percentages, departments/dimensions, other periods/year boundaries/revisions and actual Excel/print rendering. Fixture coverage does not replace source reconciliation.
3. Failure/load acceptance: incomplete data, timeout/stale response, representative uncached p95/concurrency and agreed shared-report SLA.
4. Serving backend identity, retained frontend/backend artifacts/configuration, rollback rehearsal and separate release decision.

Passing fixtures and this limited live reconciliation do not establish all accounting/security/release gates. No p95 success is claimed. History timestamps appear to encode UTC clock values with +07:00 in the UI; timezone serialization requires a focused follow-up before relying on audit display times.

## Optimistic concurrency and atomicity — 2026-10-15

- Opened the same verification template in two authenticated browser tabs at version 7.
- The first tab saved a temporary name change as version 8. The second tab then attempted to save its stale version 7 draft and received HTTP 409: `Shared report changed. Reload before saving.` The stale draft remained visible and preview/history actions stayed disabled while dirty.
- The first tab restored the original template name in a normal save as version 9. No source mapping, access, financial data or permissions were changed.
- DBX `dev` read-only verification confirmed the current `bi_shared_report` row is version 9 with the original name. `bi_shared_report_history` contains versions 7, 8 and 9 only; there is no history row or current-definition mutation from the rejected stale save.
- This closes the authenticated save conflict/atomic-history case for one Admin DB and one user. Concurrent delete/restore conflicts, cross-admin isolation and denied/revoked BU membership remain release gates.

## Local login blocker resolved

The running Vite server referenced optimized React dependency URLs whose `node_modules/.vite/deps` files no longer existed. The exact versioned React module returned HTTP 504; the unversioned path returned 404, and the root DOM stayed empty. This occurred before LoginShell's session guard could run.

Restarted only the local Vite process with `node node_modules/vite/bin/vite.js --force --host localhost --port 5173 --strictPort` to rebuild dependency optimization. Browser reload then rendered the login hero, Username and Password fields, and Sign in button without an authenticated session. No authentication guard or business logic was changed. Ohm subsequently signed in; authenticated results are recorded above.
