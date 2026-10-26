# Report data correctness verification — 2026-10-08

Scope: authenticated localhost frontend, tenant prod, year 2026, P2, Rev0, all departments. Daily Revenue (`rep-1791277247566`) Day1 and Day28; Finnacial Statement (`rep-1790065703325`) P2. No application code, report definition or database objects were changed during this verification.

## Result

**2,190 displayed numeric cells matched the calculation from independently queried database sources and stored report definitions at display precision.** This verifies the checked scenarios against the current configuration; it does not certify that the configuration expresses the intended business meaning.

| Scenario | Numeric cells compared | Mismatches | Finite row-formula arithmetic checks | Column-formula checks | Mix-percent checks |
| --- | ---: | ---: | ---: | ---: | ---: |
| Daily P2 Day1 | 615 | 0 | 70 | 164 | 164 |
| Daily P2 Day28 | 615 | 0 | 91 | 164 | 164 |
| Monthly P2 | 960 | 0 | 108 | 122 | 488 |

Independent arithmetic checks had zero failures. They also include inactive definition rows where applicable, whereas displayed-cell comparisons include only visible non-header rows. Row-formula checks skip non-finite results such as division by zero; their rendered outputs were still included in the displayed-cell comparison under the existing engine behavior.

## Method and evidence

- Serving API logs show the new grouped VGlJv query and the new 30-field VGlHis projection, confirming the runtime paths rather than relying solely on source/build success. Prior requests `688e38fbd37e44d4bc9420cae24b6149` (Daily) and `73b5b59d0c6f49b28cb64c9036e49dd2` (Monthly) identify those paths. Restart was not performed by this session because Windows denied IIS service control.
- Monthly was explicitly refreshed with Apply; Daily was selected freshly, then changed from Day1 to Day28 using the returned source dataset. Visible table cells were captured through browser DOM, including columns outside the viewport. Description order and active-row counts were checked, not just selected visible examples.
- DBX dev read-only queries fetched the two stored report definitions, account/department-group membership and the financial fields needed for these scenarios into local files. No credentials or full financial datasets were printed. SQL aggregated signed VGlJv amounts by calendar year/month/day, department, account and nature for January/February 2025/2026. The checked definitions have no dimension mappings. Grouping omitted Dim only in this independent validation dataset because it cannot affect these reports' source membership.
- Monthly baseline independently SUMs Amt2/BfAmt2 by history report dimensions, preserving the view's GlpNo and PeriodYear. Budget baseline SUMs Amt1–12 by year/revision/department/account/nature/type. No deduplication was applied. Stored GL periods confirmed Jan1/Feb1 starts in 2025 and 2026, so calendar-date probes correspond to P1/P2 here.
- The existing frontend `buildReportData` calculated all values from those independent sources; `formatReportCell` provided the exact expected display strings. Separate arithmetic evaluated stored R/C expressions and configured percent-base ratios against calculated raw values. This tests source integration and formula consistency, while reusing the production engine is not an independent reimplementation of every engine rule.
- Source row counts retained locally: 7,540 Daily aggregates, 38,964 Monthly rows and 759 Budget aggregates. The initial Monthly 5,000-row probe was detected as capped and replaced before comparison; the final 40,000-row limit did not truncate the dataset.
- Runnable verifier, input snapshots, DOM cells and results: `C:/Users/thago/AppData/Local/Temp/carmen-number-verification-20261008/verify.mjs`, sibling `results.json` and `*-ui.json`. Run `node C:/Users/thago/AppData/Local/Temp/carmen-number-verification-20261008/verify.mjs`. These temporary artifacts must be retained separately if long-term reproducibility is needed. Screenshot: sibling `daily-day28.png`.

## YTD and totals examples

Daily Hotel/Resort January Actual = **26,384,410.66**.

- Day1: January 26,384,410.66 + February PTD 674,720.67 = **27,059,131.33 YTD**, matching the displayed result.
- Day28: January 26,384,410.66 + February PTD 22,008,780.91 = **48,393,191.57 YTD**, matching the displayed result and Monthly ROOMS REVENUE YTD Actual.
- Day28 Budget YTD 48,853,400.00 − Actual YTD 48,393,191.57 = **460,208.43** variance, matching the report's `C10-C9` formula.
- Monthly NET PROFIT: current Actual **14,167,900.92**, YTD Actual **26,750,469.24**; both matched the stored row/column formulas and independently queried sources.

## Configuration findings requiring a business decision

1. Monthly `YTD - LAST YEAR` (C15) has `type=ACC` and **yearMode=current**. It currently repeats current-year YTD: ROOMS REVENUE displays **48,393,191.57**. A diagnostic calculation changing only the in-memory yearMode to -1 yields prior-year YTD **48,322,386.54**. No stored definition was modified.
2. All 41 Daily non-header rows have an empty **percentBase**. Mix columns therefore render **0.00%** under the existing engine rule. This matches configuration, but does not express a meaningful variance percentage. Confirm whether the business wants mix against total revenue or variance relative to the row's Actual/Budget before changing the configuration or engine.
3. Monthly ROOM OCCUPIED, % OF OCCUPANCY, AVERAGE ROOM RATE and NUMBER OF GUEST have no account/department/group mapping and no formula, so all their values are zero. Their displayed labels alone cannot create a calculation.
4. Monthly variance % columns are configured as **MIX** of each row's variance against its percentBase row's variance. Very large percentages can consequently be valid under that definition; they are not a conventional `(Budget-Actual)/Actual` calculation.

These findings are report-definition issues, not evidence of aggregate/projection corruption. No silent correction was applied.

## Limits

This is a current-data comparison, not an immutable before/after dataset. Validation covers P2/Rev0/all departments and the two Daily days above; other periods, revisions, tenant contracts, dimension mappings, fiscal calendars and exports remain outside this check. It establishes display precision and tested formula arithmetic, not bitwise equality of every floating-point intermediate or a completed performance p95 gate.
