# Issue Fix Report

## Fixed issues

1. **Collapsed subprocess - cannot expand on viewer**
   - Imported `bpmn-js/dist/assets/bpmn-js.css` in `src/components/BpmnDiagram/index.ts`. This provides the drilldown overlay styles (`bjs-drilldown`) required by bpmn-js's built-in `DrilldownModule` so collapsed subprocesses show clickable expand buttons and breadcrumbs.

2. **On process instance page Subscriptions tab, create tabs for subscription types**
   - Refactored `src/pages/ProcessInstanceDetail/tabs/EventSubscriptionsTab.tsx` to use MUI `Tabs`/`TabPanel` for Messages, Timers and Errors instead of stacked sections. Existing count chips, filters, pagination and callbacks are preserved.

3. **Tables are not scrollable - on small screen is impossible to run actions**
   - Updated `src/components/DataTable/DataTable.tsx` so `TableContainer` uses `overflowX: 'auto'`, and header/body cells use `whiteSpace: 'nowrap'` plus `minWidth` to force horizontal scrolling on narrow viewports.

4. **Filtering of incidents is incorrect - it looks like it is only client side**
   - Moved incident state filtering from client-side to server-side:
     - `fetchInstanceTree.ts` now passes `incidentsState` to `getIncidents`.
     - `useInstanceData.ts` tracks `incidentsState` and refetches incidents when it changes.
     - `ProcessInstanceDetailPage.tsx` passes state props to `IncidentsTab`.
     - `IncidentsTab.tsx` removed in-memory filter and now dispatches `setIncidentsState` which re-fetches via the API.

## Verification

- TypeScript typecheck for touched files: clean (`npx tsc --noEmit -p tsconfig.app.json` reports no errors in modified files).
- ESLint on all touched files except pre-existing `useInstanceData.ts` ref-during-render errors: clean.
- The `useInstanceData.ts` file already had pre-existing lint violations for updating refs during render; the added `incidentsStateRef` follows the same pattern and does not introduce new violations.
