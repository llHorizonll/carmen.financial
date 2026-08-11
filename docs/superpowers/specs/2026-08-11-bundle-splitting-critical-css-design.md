# Bundle Splitting and Critical CSS Design

## Status

Implemented and verified on 2026-08-11.

## Implementation Result

The phase shipped with intent-driven connectivity feedback, login/API and login-control boundaries, module-owned Astryx CSS, a build-time signed-out prerender, Critical CSS extraction, and automated bundle/Lighthouse gates.

| Metric | Baseline | Verified result |
| --- | ---: | ---: |
| Lighthouse desktop Performance | 100 | 100 in 3/3 runs |
| Lighthouse mobile Performance | 95 | 100 in 5/5 runs |
| Mobile FCP | 2.4 s | 1.507 s median |
| Mobile LCP | 2.4 s | 1.507 s median |
| Mobile TBT | 30 ms | 7 ms median |
| Mobile CLS | 0 | 0 |
| Entry JavaScript | 138.83 KB gzip | 62.87 KB gzip |
| Total initial JavaScript including module preloads | Not recorded | 75.35 KB gzip |
| Initial/critical CSS delivery | 40.02 KB gzip | 24.33 KB gzip total; 6.34 KB critical inline |

The final CSS loader uses a preload marker activated by the main module after `load`; it does not depend on an inline JavaScript event handler. The signed-out page is prerendered at build time and hydrated by the same React component tree. Authenticated/report behavior remains client-rendered through the existing lazy `App` boundary.

## Goal

Improve the first authenticated and unauthenticated mobile load without changing Financial BI behavior. Preserve the current Lighthouse desktop score of 100 while targeting a controlled Lighthouse mobile score of 100 through intent-driven JavaScript loading and a smaller render-blocking CSS path.

This phase is limited to delivery and rendering performance. It must not change report calculations, formula/reference rewriting, row or column data shapes, permissions, persistence, API payloads, Excel export, or print output.

## Baseline

Measured from the production Vite build at `/financial2/` on 2026-08-11:

| Metric | Current result |
| --- | ---: |
| Lighthouse desktop Performance | 100 |
| Desktop FCP / LCP | 0.5 s / 0.5 s |
| Desktop TBT / CLS | 0 ms / 0 |
| Lighthouse mobile Performance | 95 |
| Mobile FCP / LCP | 2.4 s / 2.4 s |
| Mobile TBT / CLS | 30 ms / 0 |
| Initial application JavaScript | 453.30 KB raw / 138.83 KB gzip |
| Global CSS | 237.16 KB raw / 40.02 KB gzip |
| Latin variable font | 29.40 KB |
| Authenticated `App` chunk | 76.78 KB raw / 20.12 KB gzip |
| `ReportSetup` chunk | 56.94 KB raw / 14.26 KB gzip |
| `xlsx` chunk | 424.76 KB raw / 141.51 KB gzip |

The `xlsx` chunk is already loaded on demand and is not part of the initial critical path. It must remain lazy.

### Evidence from the first split experiment

Moving the Astryx connectivity UI to an async chunk reduced the initial application JavaScript from approximately 138.83 KB gzip to 98.07 KB gzip. However, rendering that async component immediately caused its 36.11 KB gzip chunk to compete with the login shell and reduced the mobile Lighthouse score from 95 to 94.

Conclusion: creating more chunks is not sufficient. Non-critical chunks must be requested based on user intent, connectivity state, or browser idle time.

## Performance Model

The initial experience has three execution paths:

1. Signed-out user: theme initialization, login shell, login form, and minimum network/session feedback.
2. Returning signed-in user: theme initialization, authenticated application shell, report catalog, and default view.
3. Optional features: setup configurators, mapping dialogs, Excel export, OCR/import, access management, and global notification visuals.

Only code and styles required for the active path should be downloaded, parsed, and evaluated before first paint. Optional features should be loaded after an explicit interaction or during idle time when doing so will not compete with critical resources.

## Proposed Architecture

### 1. Establish a repeatable performance gate

Add scripts that build, serve, and audit the production app at the real Vite base path:

```text
/financial2/
```

The audit command must:

- use the official Lighthouse CLI;
- run against `vite preview`, not the development server;
- capture JSON output for comparison;
- execute desktop three times and mobile five times;
- report the median rather than selecting the best run;
- fail if a resource budget or functional verification fails.

Store only the script and documented thresholds in the repository. Generated Lighthouse reports and bundle visualizer files remain temporary artifacts.

### 2. Split the connectivity/notification runtime by intent

`ConnectivityFeedback` currently imports Astryx `Banner`, `ToastViewport`, and their runtime into the initial graph. Replace it with a small synchronous coordinator and an asynchronous visual layer.

The synchronous coordinator is responsible for:

- returning application children immediately;
- listening for `online`, `offline`, and `carmen-api-error` events;
- buffering the latest API/session error until the visual layer is ready;
- loading the visual layer immediately when the browser starts offline;
- preloading it on the first pointer or keyboard interaction;
- loading it during idle time with a bounded timeout;
- retrying or falling back to accessible plain text if the chunk fails to load.

The asynchronous visual layer owns:

- Astryx `ToastViewport`;
- Astryx `Banner`;
- bottom toast placement;
- the persistent offline banner;
- draining any buffered error exactly once.

This avoids losing an early API error while preventing the Astryx runtime from competing with the first paint for an online, inactive user.

### 3. Keep feature chunks interaction-driven

Continue or introduce dynamic imports at clear product boundaries:

| Feature boundary | Load trigger |
| --- | --- |
| Authenticated `App` | Existing valid session or successful login |
| `ReportSetup` | User opens SETUP |
| Rows/Columns configurator | Active setup tab only |
| Bulk Mapping dialog | User selects “Map selected” |
| Mapping editor | User selects “Edit mapping” |
| Access modal | User opens access management |
| Excel/XLSX runtime | User requests Excel export/import |
| OCR/import wizard | User starts the import flow |

Do not preload `xlsx`, OCR, or setup chunks on the login screen.

Use `React.lazy`/dynamic `import()` at component boundaries and provide stable, layout-preserving fallbacks. Dynamic import failures must surface through the existing API/error toast channel rather than leaving an empty panel.

### 4. Use manual chunks only after graph measurement

Do not start with a broad `manualChunks` vendor configuration. It can create parallel requests that still belong to the critical path and can make performance worse, as the connectivity experiment demonstrated.

After component-level splitting, inspect the generated graph. Add a manual chunk only when all of the following are true:

- the dependency is large;
- it is shared by two or more deferred features;
- extracting it reduces duplicated bytes;
- it is not pulled back into the initial route;
- median mobile Lighthouse and interaction timings improve.

`xlsx` should retain an explicit, stable chunk boundary for cacheability.

## Critical CSS Strategy

### Stage 1: Let Vite split CSS with its owning async module

Keep the minimum global foundation in the entry point:

- reset/normalization required before first paint;
- theme tokens required by the login shell;
- login shell layout and typography;
- reduced-motion rules;
- font declarations required by the first screen.

Move feature-specific styles next to their asynchronous feature entry:

- Astryx component CSS with the deferred connectivity/application layer;
- setup/configurator styles with `ReportSetup`;
- export/print-only rules with the print/export boundary where technically safe;
- avoid importing feature CSS from `main.jsx`.

Vite CSS code splitting should remain enabled. An async module must not evaluate until its associated CSS is ready, preventing a flash of unstyled feature content.

### Stage 2: Reduce the global Tailwind/Astryx surface

Audit the generated CSS by source and selector usage. The intended changes are:

- verify Tailwind scans only application source and required component packages;
- remove duplicate theme/reset imports;
- keep Astryx tokens needed by the login shell but defer component rules that are not used there;
- preserve all dark-theme, print, and reduced-motion selectors;
- verify that dynamically generated class names are safelisted before removing any CSS.

No visual selector may be removed solely because it is absent from the login-page Lighthouse crawl.

### Stage 3: Evaluate critical CSS inlining only if still needed

If the initial stylesheet remains above budget after module-level CSS splitting, evaluate a post-build critical CSS extractor against the signed-out login screen.

The extractor must:

- inline only above-the-fold login rules;
- load the remaining stylesheet without blocking first paint;
- preserve CSP compatibility;
- preserve the `/financial2/` asset base;
- avoid duplicating large token blocks;
- produce no flash of incorrect theme;
- keep print styles external;
- be removable without changing source component styling.

This is an experiment gate, not the first implementation step. Prefer Vite-native CSS splitting before adding another build dependency.

## Font Strategy

The browser currently downloads the 29.40 KB Latin Geist variable font on the first screen. Verify before changing it:

- `font-display: swap` is active;
- only the matching Unicode subset is requested;
- Cyrillic and Vietnamese subsets are not preloaded for English/Thai sessions unless required;
- the fallback stack has close metrics to minimize layout shift.

Preload the Latin font only if the Lighthouse trace shows it is the LCP dependency and the preload improves the five-run median. Do not preload all language subsets.

## File-Level Change Plan

Expected new files:

- `src/components/system/ConnectivityFeedbackCoordinator.jsx`
- `src/components/system/ConnectivityFeedbackOverlay.jsx`
- `src/components/system/ConnectivityFeedbackCoordinator.test.jsx`
- `scripts/performance-audit.mjs`
- optional async feature entry modules that import their own CSS

Expected modified files:

- `src/main.jsx`
- `src/app/LoginShell.jsx`
- `src/app/App.jsx`
- `src/components/system/ConnectivityFeedback.jsx`
- `src/index.css`
- `vite.config.js`
- `package.json`

Files that must remain behaviorally unchanged:

- report calculation and formula logic;
- API request/payload mapping;
- report row and column schema;
- Excel output behavior;
- access and permission rules.

## Implementation Sequence

### Phase A — Measurement and budgets

1. Add a production Lighthouse runner and bundle-size report.
2. Capture median desktop/mobile baselines.
3. Add bundle budgets without changing runtime code.

### Phase B — Intent-driven JavaScript

1. Add tests for buffered errors, initial offline state, intent preload, and chunk failure.
2. Split the connectivity coordinator and Astryx visual layer.
3. Confirm the visual layer does not appear in the initial online network waterfall.
4. Verify existing feature boundaries and split any remaining eager optional dialog.
5. Re-measure before adding manual chunks.

### Phase C — CSS ownership

1. Inventory global CSS imports.
2. Move feature CSS imports to async entry modules.
3. Verify theme, dark mode, print, and reduced-motion behavior.
4. Rebuild and compare initial CSS bytes and FCP.

### Phase D — Optional critical CSS extraction

Proceed only if Phase C misses the mobile target.

1. Prototype extraction as a reversible post-build step.
2. Test CSP, base path, theme flash, and cache behavior.
3. Keep it only if the five-run median improves materially.

### Phase E — Final verification

1. Run all Vitest tests.
2. Run the production build.
3. Run desktop Lighthouse three times and mobile Lighthouse five times.
4. Run the large-template configurator benchmark.
5. Smoke test login, VIEW, SETUP, Rows, Columns, mapping, Excel, print, offline, and expired-session flows.
6. Run React Doctor last.

## Acceptance Criteria

### Loading performance

- Desktop Lighthouse Performance: 100 in all three controlled runs.
- Mobile Lighthouse Performance: median 100 across five controlled runs, with no run below 98.
- Mobile FCP: at or below 1.8 s median.
- Mobile LCP: at or below 2.5 s median.
- TBT: below 100 ms median.
- CLS: below 0.1.
- Initial JavaScript: at or below 100 KB gzip, excluding deferred chunks.
- Initial CSS: at or below 25 KB gzip.
- No `xlsx`, setup, mapping, OCR, or access-management chunk in the signed-out initial waterfall.

Exact Lighthouse scores are sensitive to machine load. The median and hard byte/timing budgets are the release gate; a single best run is not sufficient evidence.

### Interaction performance

- Inactive Rows/Columns configurator remains unmounted.
- Warning preprocessing for 1,000 rows stays below 10 ms on the existing benchmark machine.
- Opening SETUP does not download Excel/OCR code.
- Switching to a configurator never loses unsaved parent-owned report edits.
- Deferred feature loading always displays an accessible fallback or error.

### Functional safety

- All current tests remain green.
- VIEW and SETUP load successfully after direct login and restored session.
- Formula references and `!REF!` behavior remain unchanged.
- Excel and print output remain usable.
- Offline banner and API/session toast behavior remain intact, including errors emitted before the visual chunk is ready.
- Local storage persists through reload.
- React Doctor score remains 100.

## Risks and Mitigations

### Early error event is lost

Mitigation: the synchronous coordinator buffers the latest event and the async overlay acknowledges it after rendering. Add a regression test that dispatches the event before the overlay import resolves.

### More chunks make the waterfall slower

Mitigation: defer by intent/idle, measure the network waterfall, and avoid broad manual vendor splitting.

### Flash of unstyled or incorrect-theme content

Mitigation: keep critical tokens synchronous, rely on Vite to load async CSS before evaluating the feature module, and test both stored themes under CPU/network throttling.

### Dynamic import fails while offline

Mitigation: load immediately when the initial state is offline when possible, retain a dependency-light accessible fallback, and expose retry after reconnect.

### CSS pruning breaks dynamic classes or print

Mitigation: never prune from a single-page crawl; verify source scanning/safelists and run dedicated print and theme smoke tests.

### Cache invalidation under `/financial2/`

Mitigation: retain hashed Vite assets, test the deployed base path, and verify that old HTML cannot reference removed chunks after deployment.

## Rollout and Rollback

Ship each phase as a separate reviewable change:

1. Measurement only.
2. Connectivity/notification split.
3. Remaining feature boundaries.
4. CSS ownership changes.
5. Optional critical CSS extraction.

Each phase must independently pass functional tests and performance gates. If a phase regresses median performance or reliability, revert that phase without reverting the earlier configurator computation improvements.

## Out of Scope

- Server-side rendering or migration to another framework.
- Changing the Carmen API or backend deployment.
- Replacing Astryx or the current UI component system.
- Rewriting the report engine in a Web Worker.
- Virtualizing the report table or configurator rows in this phase.
- Changing report calculation, import/export, or persistence semantics.

## Decision Requested

Approve the phased approach in this order:

1. performance audit automation;
2. intent-driven connectivity/Astryx split with error buffering;
3. async feature and CSS ownership cleanup;
4. critical CSS extraction only if the mobile target is still missed.

This order offers the largest reversible gain first and prevents a critical CSS tool from masking an avoidable JavaScript/CSS ownership problem.
