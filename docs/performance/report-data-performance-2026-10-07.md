# Report performance implementation record — 2026-10-07

Timezone: Asia/Bangkok. Source/build verification and a post-restart runtime smoke test are recorded separately below. The API latency gate is not complete.

## Post-restart runtime test, 12:06 Asia/Bangkok

Ohm restarted IIS. `http://localhost/Carmen.WebApi/` returned HTTP 200 in 43.7 ms; this is only the root endpoint, not report latency. Report requests were triggered through the authenticated frontend UI (tenant prod, 2026, P9, Rev0, all departments). Explicit same-filter Apply refreshes make fresh requests; Day reuse was not counted as API performance.

Live source-directory DLL SHA256: `687880BCD01596F367A6DB5BAAC2637C645F4BBC0C608AEC5ACF217C9CB5284E`, timestamp 11:59:50. It differs from the isolated build. Successful `ReportDataTiming` messages from the running endpoint confirm the timing instrumentation is active; physical-path configuration and exact loaded assembly hash remain independently unverified because appcmd access is denied.

| Report / request ID | Controller ms | Actual query ms | Budget query ms | Normalize ms | Serialize ms | Actual / Budget rows | UTF-8 response bytes |
| --- | ---: | ---: | ---: | ---: | ---: | --- | ---: |
| Daily Day30 / 08e0fee5858d4b57ac84f62b52ab5a65 | 6182.92 | 849.60 | 27.62 | 4275.13 | 530.69 | 237950 / 787 | 51622405 |
| Financial / 1762f40ea155488b81762fc41e0c8227 | 5409.03 | 681.39 | 25.80 | 4114.15 | 542.52 | 38692 / 787 | 41348325 |
| Financial refresh / df3c71aa9a6a4c5593b71ba5193684f6 | 6187.77 | 630.75 | 24.20 | 4922.67 | 578.35 | 38692 / 787 | 41348325 |
| Daily Day1 / 24ea8e9040f14cbba890fea1f27c5b27 | 6193.69 | 988.87 | 25.88 | 4622.23 | 523.22 | 237950 / 787 | 51622404 |

Evidence: bounded `rg 'ReportDataTiming' C:/dotnet/Carmen4/Carmen.WebApi/logs/logfile.log` output, correlated by request ID. No credentials or row contents were copied. Both report loading dialogs cleared and reports rendered. The browser locator wait deadline was too short to produce a reliable report-ready duration; no Network duration, transfer size, JSON parse or render timing is claimed here.

Normalization accounts for roughly 69–80% of controller time in these samples. Actual query is below 0.99 s and Budget below 0.03 s. Daily Day1 and Day30 both return 237,950 source rows; the Day filter does not narrow the API source scope. The next optimization should target normalization CPU and safely reducing redundant payload, preserving the current contract and all accounting/filter semantics. These results do not justify changing an index. Payload reduction through aggregation or response schema changes still needs source-membership/cell parity evidence and a separate design decision.

This smoke test has fewer than 20 samples and no immutable live before-build comparison. P2, full before/after financial parity, upstream authentication, transfer/frontend breakdown, and p95 gates remain open. Restart alone has not achieved the ≤3 s API target.

## Confirmed environment

- DBX `dev`, database `a_804f0906ceaf4862e87270c99071a747_paresa` was queried read-only with fully qualified names.
- Stored report names/IDs: `Daily Revenue - John CAT` / `rep-1791277247566`; `Finnacial Statement - John CAT` / `rep-1790065703325`. The latter spelling is the stored name.
- Definitions have 46 and 69 rows respectively. Only 5 and 21 rows respectively have nonempty explicit account mappings; this count includes all row types and does not establish safe pruning on its own.
- IIS `appcmd list vdir` failed with insufficient permission reading `redirection.config`. Physical path and the DLL loaded by IIS remain unverified.
- The original source-directory `bin/Carmen.WebApi.dll` SHA256 is `9BBB09065DFD0516343CE2CFC601679FF65E5297D04820FB6E84E243EB73A55D`. Its timestamp was 2026-10-07 11:27:26. This is not proof of the assembly loaded by IIS.

## Changes prepared

- `ReportV2Controller` returns `Server-Timing` and `X-Report-Request-Id` on successful report-data responses. Logs contain correlation ID, durations, Actual/Budget row counts and UTF-8 response bytes, without tokens or financial row contents.
- Timings partition permissions, definition/access checks, metadata, Actual query, Budget query, normalization and JSON serialization. Daily reports needing monthly history also expose `normalize_daily` and `monthly_query`. Query stages include provider fetching/materialization; they do not separate DB execution from transport. Controller total excludes upstream Web API authentication filters and response transfer; complete Network duration must still be measured.
- Transaction queries project the seven fields used by daily normalization: JvhDate, JvdBAmt, DeptCode, AccCode, AccNature, TransDrCr and Dim. Target DB's vGlJv exposes 29 fields; it exposes neither AccType nor Type. Unused descriptions/reference payloads are omitted. Before any multi-tenant release, verify other tenant view contracts too.
- Each financial source dictionary is indexed once with case-insensitive keys during normalization. Original first-key precedence, alias order and null behavior are preserved. Output schema, date coverage and frontend Day reuse remain unchanged.
- Added `scripts/report-normalization-benchmark.ps1`, using synthetic data only and fresh PowerShell processes for separate assemblies. It checks projected/full journal equivalence and hashes 18 normalized outputs covering monthly Actual/Budget and daily fixtures, negative amounts, nulls, dimensions, invalid dimension JSON, aliases, case and duplicate-case keys.

## Database plan evidence

Read-only EXPLAIN of the previously observed broad Journal query used a full scan of headers (estimate 34,921), JvhSeq_I detail lookups (estimate 87 per header) and account-master eq_ref lookup. These are optimizer estimates, not measured returned rows or proof that an index change will help.

Read-only EXPLAIN of broad VGlHis PeriodYear IN (2025,2026) used period-table scans and Anniversary_AccCode_DeptCode_I history lookup (estimate 9,429). This is a candidate monthly path probe; Financial Statement's exact generated request path has not yet been captured. Do not label it the measured Financial Statement query.

Existing Budget and journal date indexes were retained. No index, schema, view or tenant data changed. No aggregation or server cache was introduced.

## Verification results

| Check | Evidence | Result |
| --- | --- | --- |
| Legacy WebApi source compilation | VS 18 Community MSBuild, Debug, isolated output, existing dependency DLLs | Passed |
| Current linked-source backend tests | Compiled planner/filter/access/definition sources and their four test classes with Roslyn and .NET Framework 4.6.2 facade references; xUnit console | 26 passed, 0 failed |
| Frontend regression set | Checklist's nine-file Vitest command | 150 passed, 0 failed |
| Frontend production build | `bun run build` | Passed; critical-css step still warns that `/financial/assets/...css` could not be located; unrelated existing build limitation |
| Normalization output equivalence | Benchmark against original DLL and isolated new DLL | Identical 18-output SHA256 `1D233C940F7E141DE447EB485B8DB3869931C42386D88D2C9079B16444EF7F4C` |
| Journal projection fixtures | Wide vs projected synthetic rows through the real private normalizer | All 6 variants passed |
| Synthetic normalization performance | 5 samples of 5,000 rows, same script/input/process type | Median 326.02 ms before, 233.68 ms after (~28% reduction) |

Before samples (ms): 361.26, 328.75, 326.02, 322.05, 320.79. After: 262.08, 229.98, 233.68, 234.63, 229.56. This includes reflective invocation overhead, is not production profiling, and cannot predict the API's total speedup. These five samples do not satisfy the 20-sample API p95 gate.

## Build and reproduction

Isolated output: `C:\Users\thago\AppData\Local\Temp\carmen-report-perf-20261007\backend`. Existing dependency DLLs were copied from the source-directory bin into this output before compilation. No live bin was overwritten. Original source-directory DLL/PDB backup: sibling `baseline` directory. Temporary artifacts should be preserved before any deployment; they are not durable release storage.

Prepared backend DLL SHA256: `D8EA5C64F93040272E8296DEAB82060C87F20F8E60A75484892AAD54AEE367F4`. After the isolated build, the source-directory bin DLL still matched the original hash above.

```powershell
& 'C:/Program Files/Microsoft Visual Studio/18/Community/MSBuild/Current/Bin/MSBuild.exe' C:/dotnet/Carmen4/Carmen.WebApi/Carmen.WebApi.csproj /t:Build /p:Configuration=Debug /p:OutputPath=C:/Users/thago/AppData/Local/Temp/carmen-report-perf-20261007/backend/ /p:IntermediateOutputPath=C:/Users/thago/AppData/Local/Temp/carmen-report-perf-20261007/obj/ /p:BuildProjectReferences=false /verbosity:quiet /nologo /clp:ErrorsOnly
powershell -NoProfile -File scripts/report-normalization-benchmark.ps1 -AssemblyPath C:/dotnet/Carmen4/Carmen.WebApi/bin/Carmen.WebApi.dll
powershell -NoProfile -File scripts/report-normalization-benchmark.ps1 -AssemblyPath C:/Users/thago/AppData/Local/Temp/carmen-report-perf-20261007/backend/Carmen.WebApi.dll
```

The previous VS 2022 Community installation lacked WebApplication.targets; VS 18 Community is the working toolchain. Linked backend test output is at sibling `tests/ReportPerformance.Tests.dll`. It contains the current source, not merely the old test binary.

## Pending release gates

The sections above record the earlier implementation. The continuation below supersedes its no-aggregation statement, seven-field projection-only implementation, Daily monthly-history query, prepared DLL hash and previous test count. Earlier live timing samples remain historical measurements.

- Confirm IIS physical path and serving assembly; user input requested because configuration access was denied.
- Capture exact SQL and immutable baseline for both reports, measure ≥20 uncached API/report-ready samples per main filter and record response size and stage timings.
- Validate live before/after cells and source membership, including dimensions, fiscal boundaries, revisions and tenant isolation. Fixture equivalence is not a substitute.
- Prepare a deployment manifest against the confirmed target, retain its actual serving build/configuration, and rehearse restore before promotion. Do not copy the entire isolated dependency directory into IIS.
- Only after those gates may the prepared backend be deployed for comparison. No production deployment, cache, cancellation integration, DB write, migration or completed p95 claim was made in this step.

## Continuation — YTD correctness and both source paths, 2026-10-07

### Implementation

- `IncludeMonthlyTotalsForDailyRows` recognizes YTD as requiring monthly Actual rows even without visible AC/ACC. `GetReportDataAsync` also treats a YTD-only report as transaction-based. The unchanged frontend formula is `ACC - AC + PTD`.
- Daily reports always derive required monthly totals from their normalized daily transactions; the extra VGlHis query is removed. Daily rows remain alongside monthly rows, retaining Day switches and full required-year coverage. Monthly rows have no day/amount, so the existing engine does not count them as daily transactions; daily rows have no amt/bfamt, so they do not double-count monthly totals.
- `AggregateDailyFinancialRows` groups VGlJv by JvhDate, DeptCode, AccCode, AccNature, TransDrCr and Dim, and sums JvdBAmt. It runs after date, Prefix/Status and requested/mapped department/account filters, before materialization. Nature and debit/credit direction remain separate until the existing normalizer applies the sign. Dim remains part of the SQL grouping. No truncation to the selected Day and no additional history query is introduced. Monthly dimension-mapped reports reuse this transaction path.
- Monthly VGlHis uses `SelectMonthlyFinancialRows`: PeriodYear, GlpNo, DeptCode, AccCode, AccNature, AccType plus Amt1–12 and BfAmt1–12 (30 of the target view's 66 columns). There is no GROUP BY, DISTINCT or deduplication in this path. Beginning balances come directly from history, not reconstruction. The target view has no Dim, description, revision or caption fields; their prior normalized defaults remain unchanged.
- Actual normalization and transaction-derived monthly rows omit the unused dr1–12/cr1–12 fields. Targeted searches of report components, adapters, engine and hooks found no consumers. Budget query, fields and normalization behavior remain unchanged, including its Dr/Cr fields. The retained fields and four-pass calculations are unchanged.
- Existing uncommitted timing/indexing and other work were preserved. No frontend calculation source, controller, database object, IIS configuration or live build was intentionally changed by this continuation.

### Verification and measured scope

Both the legacy WebApi project and its actual test project built with VS 18 MSBuild using isolated output and `BuildProjectReferences=false`. xUnit ran the four requested classes (planner, SQL filters, access policy, definition contract): **30 passed, 0 failed, 0 skipped**. The previously missing aggregation method now compiles. Added checks preserve SQL filters/bindings and all twelve history amount/beginning-balance pairs. The existing YTD regression verifies January totals carried into February's beginning balance.

The updated `scripts/report-normalization-benchmark.ps1` compares every retained Actual field and every Budget field across 18 real-normalizer fixture outputs. It excludes only the deliberately removed Actual Dr/Cr fields from baseline comparisons. It also checks full/projected daily equivalence (six variants) and target-view monthly projection equivalence (four variants). Before/after retained-output SHA256: `D9FE48BA70786CDDA478DEC6DDC188C14A9992299EB99A947B235036BF130143` in both fresh processes.

Synthetic 5,000-row monthly normalization samples (ms): baseline `[264.58,234.42,237.06,235.18,234.09]`; prepared `[190.60,157.85,159.77,156.89,156.92]`. Median **235.18 → 157.85 ms (~32.88% reduction)**. Reflective invocation and synthetic data are included; this is not API latency or a p95 result. Frontend tests were not rerun because no frontend contract/calculation implementation changed; the actual private normalizer fixtures cover retained response-field compatibility. `git diff --check` passed.

Current DBX read-only probe of the same broad calendar interval `[2025-01-01,2027-01-01)` and Prefix <> YE / Status <> 9 found **237,968 raw → 44,061 grouped rows (81.48% reduction)**. Signed totals matched exactly in SQL. These are SQL result counts before normalization/monthly-total appending, not API response counts. The handoff's earlier **237,950 → 44,046 (~81.49%)** is historical; current counts differ and no frozen data snapshot exists. This probe does not prove every report cell or tenant matches.

Reproduction query shape (database above, DBX dev, `--limit 1 --timeout 20s --json`): compare raw COUNT and signed SUM to COUNT and signed SUM of the grouped subquery below. The signed-total equality was evaluated inside SQL; amounts were not printed.

```sql
SELECT JvhDate, DeptCode, AccCode, AccNature, TransDrCr, Dim,
       SUM(JvdBAmt) AS JvdBAmt
FROM a_804f0906ceaf4862e87270c99071a747_paresa.VGlJv
WHERE JvhDate >= '2025-01-01' AND JvhDate < '2027-01-01'
  AND Prefix <> 'YE' AND Status <> 9
GROUP BY JvhDate, DeptCode, AccCode, AccNature, TransDrCr, Dim;
```

The probe aggregates output locally in SQL; do not dump the grouped transactions into the conversation. DBX information_schema confirmed the 66-column VGlHis contract before implementation.

```powershell
& 'C:/Program Files/Microsoft Visual Studio/18/Community/MSBuild/Current/Bin/MSBuild.exe' C:/dotnet/Carmen4/Carmen.WebApi.Test/Carmen.WebApi.Test.csproj /t:Build /p:Configuration=Debug /p:OutputPath=C:/Users/thago/AppData/Local/Temp/carmen-report-perf-20261007/tests/ /p:IntermediateOutputPath=C:/Users/thago/AppData/Local/Temp/carmen-report-perf-20261007/test-obj/ /p:BuildProjectReferences=false /verbosity:quiet /nologo /clp:ErrorsOnly
& 'C:/dotnet/Carmen4/packages/xunit.runner.console.2.4.1/tools/net452/xunit.console.exe' C:/Users/thago/AppData/Local/Temp/carmen-report-perf-20261007/tests/Carmen.WebApi.Test.dll -class Carmen.WebApi.Test.ReportDataQueryPlannerTests -class Carmen.WebApi.Test.FinancialReportQueryFiltersTests -class Carmen.WebApi.Test.ReportAccessPolicyTests -class Carmen.WebApi.Test.ReportDefinitionContractTests -noshadow
```

WebApi build and fresh-process benchmark commands are in the earlier reproduction section. Prepared DLL SHA256 at measurement: `8969C96E939A7D4980E02823F920AB5CD2E494F0D706E1DA496CD6EE63A9DA8A`. Benchmark baseline was the existing source-bin DLL, hash `9C8E9DB87115E196CB7E6892A62ADFCBF546A0B17C36E9FBA477E1EB31C8D357`, timestamp 2026-10-07 16:08:28; its serving-IIS identity is unverified. Other concurrent source work means the prepared hash describes that build, not an immutable release manifest.

### Remaining verification and rollback

No deployment was performed. Before rollout, confirm other tenant VGlHis/VGlJv contracts, SQL collation/grouping behavior for code/Dim strings, fiscal boundaries, brought-forward balances, mixed Daily AC/ACC use and all report cells/formulas/percentages against an immutable baseline. Daily mixed monthly columns now intentionally use transaction-derived totals; differences from independently stored history must be investigated, not hidden by formula changes. Budget revisions, access isolation and Day reuse still require live smoke tests. Verify API response size/row counts after appended monthly totals, then ≥20 uncached latency/report-ready samples for both reports. No live improvement or financial-cell parity is claimed from the synthetic and aggregate checks.

Rollback: retain the verified serving DLL/PDB/configuration before any separately authorized deployment; restore that exact build if values, access, failures or latency regress. For source rollback, reverse only the continuation's hunks in FncReportV2, FinancialReportQueryFilters and ReportDataQueryPlanner; preserve unrelated uncommitted work and regression tests. Reverting YTD support reintroduces the known correctness bug, so that older build is not a correctness-approved release. No schema/data rollback is required. Do not copy all isolated dependency DLLs into IIS.

Files touched by this continuation: backend `Functions/FncReportV2.cs`, `Functions/FinancialReportQueryFilters.cs`, `Functions/ReportDataQueryPlanner.cs`, `Carmen.WebApi.Test/FinancialReportQueryFiltersTests.cs`; retained preexisting `ReportDataQueryPlannerTests.cs` YTD regression; frontend `scripts/report-normalization-benchmark.ps1` and the three existing performance documents.
