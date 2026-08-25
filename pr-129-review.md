# Code Review — PR #129: fix(#805): handle malformed build metadata and system status responses gracefully

**PR:** https://github.com/pbinitiative/zenbpm-ui/pull/129  
**Author:** @Kuzna  
**Branch:** `fix/805-Prevent-application-crash-when-system-status-returns-malformed-data`  
**Base:** `main`  
**Date reviewed:** 2026-08-25  
**Files changed:** 8 (+175 / -45)

---

## Summary

The PR addresses a crash that occurs when the backend `/system/status` endpoint returns a response that is missing the `build` metadata fields (or is otherwise structurally invalid). Without this fix, unguarded property access (e.g. `data.build.version`) throws a runtime exception, which bubbles up as an "Unexpected Application Error!" in the React error boundary.

The fix introduces runtime type guards for both the lightweight `BuildMetadata` shape used by the footer and the richer `ClusterStatus` shape used by the System Status page, and replaces the invisible `<TextField>` search placeholder in the header with a cheap `<Box>` spacer.

---

## Findings

### ✅ Positive observations

1. **Well-scoped runtime validation** — `isBuildMetadata` and `isClusterStatus` cover every field the code subsequently reads. Using explicit `isRecord` / `isInteger` helpers makes each predicate composable and easy to extend.

2. **Two-layer guard approach is correct** — `BuildMetadataFooter` uses `parseBuildMetadata` (throws on bad data, caught by React Query → `isError` path), and `SystemStatusPage` uses `isClusterStatus` (inline throw, same effect). Both paths end up showing a graceful UI error instead of crashing.

3. **`retry: false` on `useQuery`** — added in both call-sites to avoid retrying on a persistently malformed response. This is the right call; without it React Query would silently spam the server three times before surfacing the error.

4. **Mock handler `malformed` scenario** — the mock returns a response that passes the `git` / `commitId` check but is missing `build.*`, which is exactly the real-world failure mode described in issue #805. This correctly exercises both the footer and the System Status page failure paths.

5. **E2E test coverage** — three new/extended tests cover the malformed scenario end-to-end with `pageerror` collection, ensuring no uncaught JS exceptions escape to the console.

6. **Header spacer change** — replacing the `visibility: hidden` `<TextField>` (which still rendered DOM nodes, had focus-trapping implications and included dead i18n strings) with an `aria-hidden` `<Box>` spacer is a clean improvement. The dedicated `header-search-spacer` test-id makes it straightforward to assert layout in the new E2E test.

7. **Optional-chaining in `BuildInformationColumn`** — switching `metadata?.build.version` → `metadata?.build?.version` is a small but meaningful safety net that removes a potential crash if `metadata` is truthy but `build` is undefined (possible during a very short transition window between renders).

---

### ⚠️ Issues and suggestions

#### 1. `isRecord` is defined twice — low severity

**Files:** `src/base/buildMetadata.ts:23`, `src/pages/SystemStatus/SystemStatusPage.tsx:60`

Both modules define an identical private `isRecord` helper. This is minor duplication but could cause drift over time. Consider exporting `isRecord` (or a more focused `isPlainObject`) from `buildMetadata.ts` and importing it in `SystemStatusPage.tsx`.

```ts
// buildMetadata.ts — export it
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// SystemStatusPage.tsx — import instead of redeclaring
import { ..., isRecord } from '@base/buildMetadata';
```

#### 2. `malformed` mock omits `build.*` but the footer query key is shared — potential cache collision

**File:** `src/mocks/handlers/systemStatus.ts:51-60`

The `BuildMetadataFooter` uses query key `['systemStatus', 'buildMetadata']` and the `SystemStatusPage` uses `['systemStatus']`. These are different keys, so they do not share a cache entry. However, the mock intercepts a *single* handler (`GET /system/status`) and branches on `systemStatusScenario` read from the *referrer* URL. When a user navigates to `/?systemStatusScenario=malformed`, the footer will also receive the malformed response (missing `build.*`), which is the intended behaviour and is correctly tested.

The scenario URL parameter is read from the *referrer*, not the request URL itself, which means navigating within the SPA to the System Status page after landing with `?systemStatusScenario=malformed` will keep the scenario active. The E2E test for `system-status.spec.ts` works around this by using `window.history.replaceState` + `Refresh` button click — this is fragile since `replaceState` does **not** change `document.referrer`, so the mock will not actually pick up the new scenario. The test may pass for the wrong reason (the query is already in an error state from a previous fetch, or the cache already holds stale data).

**Recommendation:** Verify the E2E scenario activation logic. A simpler approach would be to have the `malformed` test navigate directly to `/system-status?systemStatusScenario=malformed` (as the footer test does with `/?systemStatusScenario=malformed`).

#### 3. `parseBuildMetadata` is exported but not tested in isolation — low severity

**File:** `src/base/buildMetadata.ts:39-45`

There are currently no unit tests for `isBuildMetadata` or `parseBuildMetadata`. The E2E tests cover the happy/error paths indirectly, but a unit test (e.g., with Vitest) would be a faster feedback loop and would pin the contract of the validator. This is a suggestion rather than a blocker.

#### 4. `isClusterStatus` re-validates `BuildMetadata` fields already checked by `isBuildMetadata` — cosmetic

**File:** `src/pages/SystemStatus/SystemStatusPage.tsx:87-102`

`isClusterStatus` calls `isBuildMetadata(status)` which checks `git.*` and `build.*` fields. It then additionally checks `clusterConfig`, `partitions`, and `nodes`. This composited check is correct and readable — no changes needed, just confirming it is intentional.

#### 5. `clusterConfig` change in mock (3 → 1 desired partitions) — cosmetic

**File:** `src/mocks/handlers/systemStatus.ts:21`

The `createSystemStatus` helper now returns `desiredPartitions: 1` with a real node entry (`node-1`). This is a meaningful improvement over the previous stub (`desiredPartitions: 3` with empty `partitions: {}` and `nodes: {}`), which would have caused `isClusterStatus` to fail validation for the happy-path mock. The change aligns the mock with the real backend shape.

#### 6. `header-search-spacer` breakpoint is `md` but design button uses different breakpoints — low severity

**File:** `src/components/layouts/MainLayout.tsx`

The spacer hides at `xs`/`sm` (`display: { xs: 'none', md: 'block' }`). If the Design button or avatar section also adjusts layout at `sm`, the column spacing may be inconsistent between 768 px and 899 px. The E2E test uses 899 px as the boundary, which matches the `md` breakpoint of the default MUI theme (≥ 900 px). This is consistent, but worth double-checking visually at 768–899 px.

---

## Summary table

| # | Severity | File | Finding |
|---|----------|------|---------|
| 1 | Low | `buildMetadata.ts`, `SystemStatusPage.tsx` | `isRecord` duplicated in two modules |
| 2 | Medium | `system-status.spec.ts`, mock handler | E2E test for malformed system-status may pass for the wrong reason due to `replaceState` not updating `document.referrer` |
| 3 | Low | `buildMetadata.ts` | No unit tests for `isBuildMetadata` / `parseBuildMetadata` |
| 4 | Cosmetic | `SystemStatusPage.tsx` | `isClusterStatus` composition is intentional and correct |
| 5 | Cosmetic | `systemStatus.ts` (mock) | Happy-path mock updated to a realistic shape — correct |
| 6 | Low | `MainLayout.tsx` | Search-spacer breakpoint should be verified visually at 768–899 px |

---

## Verdict

The PR **correctly fixes** the crash described in issue #805. The runtime validation approach is sound, the error handling paths are exercised by new E2E tests, and the header cleanup is a net improvement. The one finding worth addressing before merge is **#2** (the E2E test for the System Status malformed scenario may not exercise the intended code path). The remaining findings are low priority and can be addressed in follow-up issues.

**Recommendation: Approve with minor comment on finding #2.**
