# Report Data Performance — Execution Checklist

Created: 2026-10-07, Asia/Bangkok. Reference: [investigation and plan](report-data-performance.md).

Implementation evidence: [2026-10-07 source/build record](report-data-performance-2026-10-07.md). Pending gates below remain open even when source tests pass.

Continuation: YTD monthly dependency, filtered Daily SQL aggregation and Monthly projection/normalization are implemented. Current read-only Daily probe: 237,968 → 44,061 rows (81.48%), identical signed totals. Four backend classes: 30 tests passed; actual-normalizer retained-field/Budget fixtures and daily/monthly projection checks passed. WebApi and test-project builds passed. Synthetic monthly median: 235.18 → 157.85 ms. Full financial-cell parity and deployed measurements remain open; these results do not close C01–C08 or P01.

Frontend: `C:\source\carmen.financial`  
Backend: `C:\dotnet\Carmen4\Carmen.WebApi`  
Database: `a_804f0906ceaf4862e87270c99071a747_paresa`, DBX connection `dev`.

This is a pre-change checklist. Application changes already made in the conversation are recorded in the investigation document; they do not count as completion of these future measurement/release gates. No application edit, deployment or DB mutation is authorized by checking a box here.

## Recording rules

Use only `ยังไม่ตรวจ / ผ่าน / ไม่ผ่าน / ติดข้อจำกัด` as status. Change a status only with evidence. For each row record Bangkok timestamp, command or artifact reference, measured result and limitations. Keep artifacts local and access-controlled; never include credentials, session tokens or transaction dumps in these documents. Redact authorization headers from any captured network artifact.

## Measurement and correctness gates

| ID | Check | Status | Timestamp / command or evidence | Result / limitation |
| --- | --- | --- | --- | --- |
| M01 | Confirm stored Daily Revenue name/ID and Financial Statement name/ID; resolve sidebar spelling difference | ผ่าน | 2026-10-07; DBX SELECT ReportId,ReportName from bi_report_definition | Daily `rep-1791277247566`; stored `Finnacial Statement - John CAT`, `rep-1790065703325` |
| M02 | Confirm IIS physical path, serving backend build/version and frontend build; distinguish source from deployed binary | ติดข้อจำกัด | 2026-10-07; appcmd list vdir | Configuration read denied; isolated source build is not serving-build confirmation |
| M03 | Freeze comparable report definitions, data version, tenant, user permissions, browser and filters before/after | ยังไม่ตรวจ | — | Use the same inputs for both implementations |
| M04 | Measure both reports with year 2026, P2/P9, Day1/last valid day and Rev0 | ยังไม่ตรวจ | — | For monthly-only reports mark Day inapplicable with reason; verify fiscal dates rather than assuming calendar months |
| M05 | Record ≥20 samples per primary report/filter, separately for first load and repeated uncached refresh | ยังไม่ตรวจ | — | Separate warm-up; calculate p95 using sorted sample at ceil(0.95 × n), plus p50/min/max |
| M06 | Record API duration, decoded response size and transfer bytes, Actual/Budget row counts, JSON parse, calculation, render-ready and total report-ready time | ยังไม่ตรวจ | — | Define report-ready as correct values visible and loading complete; report dev/production measurements separately |
| M07 | Measure cached Day switches separately; verify same-Day Apply makes one fresh request | ยังไม่ตรวจ | — | Cache hit cannot substitute for M05/M06 |
| M08 | Measure backend auth/tenant/permissions, definition, Actual, Budget, materialization, normalization, serialization and total stages | ติดข้อจำกัด | 2026-10-07 12:06; live ReportDataTiming IDs/table in implementation record | Live controller stages captured for both reports. Normalize dominates (4.11–4.92 s); upstream auth, DB transport/materialization separation and transfer remain unmeasured |
| M09 | Capture exact generated SQL and bounded EXPLAIN through DBX for both reports | ยังไม่ตรวจ | — | Existing index inventory and projected Budget EXPLAIN are preliminary evidence only |
| C01 | Compare every raw cell and displayed cell, subtotal, Grand Total, REVPAR and percentages before/after | ยังไม่ตรวจ | — | No unexplained difference at accounting precision; document any raw floating-point difference |
| C02 | Verify account/department/group/department-group mappings, explicit overrides, duplicate/normalized codes and multi-dimension AND semantics | ยังไม่ตรวจ | — | Compare source membership as well as totals |
| C03 | Verify daily/PTD/monthly/YTD, previous year/period, fiscal/year boundaries, quarters, specific periods and brought-forward balances | ยังไม่ตรวจ | — | Preserve source coverage needed by Day reuse |
| C04 | Verify parameter/specific budget revisions, Rev0–4 and separation of Actual/Budget | ยังไม่ตรวจ | — | — |
| C05 | Verify forward/nested Row Formula, Column Formula, percent base, zero denominator, missing and circular references | ยังไม่ตรวจ | — | Preserve current engine behavior and visible unavailable values |
| C06 | Verify rapid navigation/filter changes, duplicate requests, stale responses, timeout/retry and recovery from errors | ยังไม่ตรวจ | — | No stale result wins or stuck Loading state |
| C07 | Verify tenant/access isolation and data freshness; refresh and changed report definition invalidate reuse | ยังไม่ตรวจ | — | Any later server cache needs separate key/invalidation tests |
| C08 | Verify VIEW/SETUP, Excel export, Print and Save/Reload | ยังไม่ตรวจ | — | Rendered and exported values/formats agree |
| C09 | Run frontend engine/import/view/setup/API/App regressions and relevant backend report tests | ผ่าน | 2026-10-07; commands/results in implementation record | Earlier frontend 150; continuation actual backend test project 30; real normalizer fixtures 18 with retained-field equivalence; daily/monthly projection checks and isolated WebApi/test-project builds passed. No frontend source changes, so frontend suite not rerun. Live financial parity still pending |
| P01 | API p95 ≤3s and report-ready p95 ≤5s for uncached scenarios, with ≥20 samples each | ยังไม่ตรวจ | — | If missed, record dominant stage and measured gap; do not mark passed from cache results |

## Results worksheet

Duplicate this table per report/filter and before/after build. Record tenant, report ID/definition version, year/period/day/revision/departments, data version, browser, backend/frontend build, production/development mode and timestamp range above it.

| Scenario | n | API p50/p95 ms | Report-ready p50/p95 ms | Actual/Budget rows | Decoded/transfer bytes | JSON/calculation/render ms | Evidence / limitation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| First load, uncached | — | — | — | — | — | — | — |
| Same filters, explicit refresh | — | — | — | — | — | — | — |
| Day change, existing source data | — | No request or measured request | — | — | — | — | Separate cache metric |

## Read-only database probes

Use fully qualified database tables for every query; `dev` may default to another database. Commands below are safe preliminary probes, not substitutes for each report's exact generated query. Keep outputs compact and timeouts bounded.

```powershell
dbx schema describe dev gljvh --database a_804f0906ceaf4862e87270c99071a747_paresa --json
dbx query dev "SELECT TABLE_NAME, INDEX_NAME, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columns_in_order FROM information_schema.STATISTICS WHERE TABLE_SCHEMA='a_804f0906ceaf4862e87270c99071a747_paresa' AND TABLE_NAME IN ('gljvh','gljvd','glhis','budget') GROUP BY TABLE_NAME,INDEX_NAME" --limit 30 --timeout 10s --json
dbx query dev "EXPLAIN SELECT Year,Revision,DeptCode,AccCode FROM a_804f0906ceaf4862e87270c99071a747_paresa.VBudget WHERE Year IN (2025,2026) AND Revision IN (0)" --limit 15 --timeout 10s --json
```

Frontend regression command, from the frontend directory:

```powershell
bun run test -- src/app/App.test.jsx src/features/report/lib/reportLogic.test.js src/features/report/lib/excelTemplateImport.test.js src/features/report/lib/excelTemplateImport.fixtures.test.js src/features/report/components/ReportView.test.jsx src/features/report/components/RowsConfigurator.test.jsx src/features/report/lib/reportAdapters.test.js src/features/report/lib/reportApi.test.js src/features/report/lib/rowNumberFormat.test.js
bun run build
```

Backend verification must include ReportDataQueryPlannerTests, FinancialReportQueryFiltersTests, ReportAccessPolicyTests and ReportDefinitionContractTests. Confirm the supported build/test toolchain before recording exact commands; a linked-source test pass alone does not prove the legacy IIS application build or deployment.

## Deployment and rollback gates

| ID | Check | Status | Timestamp / evidence | Result / limitation |
| --- | --- | --- | --- | --- |
| R01 | Record current deployed frontend/backend versions and retain restorable build artifacts/configuration | ยังไม่ตรวจ | — | Do not store secrets in the checklist |
| R02 | Write exact deployment and rollback steps for the verified IIS/frontend targets before deployment | ยังไม่ตรวจ | — | Include any config switches and cache invalidation; do not invent unimplemented flags |
| R03 | Separate any proposed index/schema migration from code rollout; review execution plan, lock risk, backup and reversal before DB change | ยังไม่ตรวจ | — | DBX remains read-only in this task; no duplicate existing index |
| R04 | Verify deployed build identity, authorization and representative totals immediately after rollout | ยังไม่ตรวจ | — | Source build success alone is insufficient |
| R05 | Rehearse restoring prior frontend/backend build and configuration, then recheck totals and request lifecycle | ยังไม่ตรวจ | — | If later schema changes exist, include their separately approved rollback procedure |
| R06 | Define rollback trigger: any financial mismatch, tenant/access leak, elevated failures or latency regression against baseline | ยังไม่ตรวจ | — | Preserve redacted timing evidence during rollback |
| R07 | Record final before/after statistics, remaining bottlenecks and release decision | ยังไม่ตรวจ | — | Failed accuracy/security gates block release regardless of speed |

Index/schema changes and production deployment are separate future work. This checklist documents readiness and evidence; it does not perform or approve those operations.
