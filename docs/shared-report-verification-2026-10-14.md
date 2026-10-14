# Shared report verification — 2026-10-14

Scope: local Carmen Financial and Carmen.WebApi; DBX `dev`, read-only. No migration, financial data change, deployment or report lifecycle write was performed.

## Verified

- DBX information_schema confirms `bi_shared_report` and `bi_shared_report_history` exist in the Admin database. Both use InnoDB.
- All 11 columns match `App_Data/SharedReports/001-create-admin-shared-reports.sql`, including types, NOT NULL and primary keys. Primary keys are ReportId and (ReportId, Version), respectively.
- Both tables currently have zero rows. No stored shared configuration is available for reconciliation yet.
- Unauthenticated GET `http://localhost/Carmen.WebApi/api/shared-reports/capabilities` returns HTTP 401. This proves the unauthenticated request is rejected, not authenticated capability availability or serving assembly identity.
- Targeted shared frontend tests: 13 passed / 2 files.
- Full frontend regression suite: 280 passed / 33 files; `bun run test -- --maxWorkers=4 --testTimeout=15000`, 26.36 seconds. Existing Node localstorage-file warnings remain.

## Pending, in execution order

1. Obtain an authenticated local session with permission for two participating BUs. The agent-created in-app browser displayed a blank page; no usable authenticated session was available. Local frontend HTTP returned 200; this does not establish UI readiness.
2. Verify authenticated capabilities and serving backend identity. Create a clearly named verification template through the application API, then save/reload/clone/history/restore/soft-delete and check optimistic concurrency. Keep existing business reports unchanged.
3. Choose actual source mappings and reconcile per-BU Actual/Budget against independent DBX queries, then combined formulas, percentages and KPI. Record currency, fiscal filters, sign and budget-scenario assumptions.
4. Verify ACL, cross-admin isolation, denied/revoked BU membership, incomplete data, timeout/stale response and export/print behavior. Permission changes require a controlled test account/fixture; do not alter business-user permissions.
5. Measure representative uncached latency/load and define shared-report SLA, then retain serving builds/configuration and prepare rollback before a separate release decision.

Schema inspection is not proof that the authenticated session resolves to this Admin database. Passing frontend fixtures is not database lifecycle or accounting acceptance. No shared reconciliation or p95 success is claimed.

## Local login blocker resolved

The running Vite server referenced optimized React dependency URLs whose `node_modules/.vite/deps` files no longer existed. The exact versioned React module returned HTTP 504; the unversioned path returned 404, and the root DOM stayed empty. This occurred before LoginShell's session guard could run.

Restarted only the local Vite process with `node node_modules/vite/bin/vite.js --force --host localhost --port 5173 --strictPort` to rebuild dependency optimization. Browser reload then rendered the login hero, Username and Password fields, and Sign in button without an authenticated session. No authentication guard or business logic was changed. Authenticated lifecycle remains pending login.
