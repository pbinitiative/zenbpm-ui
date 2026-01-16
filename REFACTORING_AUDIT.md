# ZenBPM-UI Development Rules Audit Report

**Generated:** 2026-01-05
**Purpose:** Track violations of DEVELOPMENT_RULES.md for systematic fixing

---

## Executive Summary

| Category | Violations | Severity | Status |
|----------|------------|----------|--------|
| Missing Storybook Stories | 27 components | CRITICAL | [ ] |
| Hardcoded Colors | 70+ instances | CRITICAL | [ ] |
| Hardcoded Text (missing i18n) | 60+ instances | CRITICAL | [ ] |
| Components Too Large (>300 lines) | 12 components | HIGH | [ ] |
| Missing data-testid | Most pages/components | HIGH | [ ] |
| `any` Types | 11 instances | MEDIUM | [ ] |
| Hardcoded Font Families | 10+ instances | LOW | [ ] |
| Directory Structure | 4 detail pages | LOW | [ ] |

---

## 1. CRITICAL: Missing Storybook Stories

**Rule:** All reusable components MUST have a `.stories.tsx` file.

**Status:** [ ] Not Started

### Components Without Stories (27 total)

- [ ] `src/components/BpmnDiagram/BpmnDiagram.tsx`
- [ ] `src/components/BpmnEditor/BpmnEditor.tsx`
- [ ] `src/components/DataTable/DataTable.tsx`
- [ ] `src/components/DateRangePicker/DateRangePicker.tsx`
- [ ] `src/components/DiagramDetailLayout/DiagramDetailLayout.tsx`
- [ ] `src/components/DmnEditor/DmnEditor.tsx`
- [ ] `src/components/DmnViewer/DmnViewer.tsx`
- [ ] `src/components/IOSSwitch/IOSSwitch.tsx`
- [ ] `src/components/IncidentsTable/IncidentsTable.tsx`
- [ ] `src/components/LoadingIndicator/LoadingIndicator.tsx`
- [ ] `src/components/MonoLink/MonoLink.tsx`
- [ ] `src/components/MonoText/MonoText.tsx`
- [ ] `src/components/NavButton/NavButton.tsx`
- [ ] `src/components/PageHeader/PageHeader.tsx`
- [ ] `src/components/PartitionedTable/PartitionedTable.tsx`
- [ ] `src/components/PrimaryButton/PrimaryButton.tsx`
- [ ] `src/components/ProcessInstancesTable/ProcessInstancesTable.tsx`
- [ ] `src/components/StartInstanceDialog/StartInstanceDialog.tsx`
- [ ] `src/components/StateBadge/StateBadge.tsx`
- [ ] `src/components/SubTabs/SubTabs.tsx`
- [ ] `src/components/TablePagination/TablePagination.tsx`
- [ ] `src/components/TableWithFilters/TableWithFilters.tsx`
- [ ] `src/components/TypeBadge/TypeBadge.tsx`
- [ ] `src/components/VersionPill/VersionPill.tsx`
- [ ] `src/components/VersionSwitcher/VersionSwitcher.tsx`
- [ ] `src/components/XmlEditor/XmlEditor.tsx`

---

## 2. CRITICAL: Hardcoded Colors

**Rule:** All colors must come from theme or `themeColors` export. Never use hex codes, rgb(), rgba() directly.

**Status:** [ ] Not Started

### 2.1 Pages with Hardcoded Colors

#### ProcessInstanceDetailPage.tsx
- [ ] Line 157: `bgcolor: '#f5f5f5'` → Use `'grey.100'` or `'background.default'`

#### ProcessDefinitionDetailPage.tsx
- [ ] Line 255: `bgcolor: '#f5f5f5'` → Use `'grey.100'`

#### DecisionDefinitionDetailPage.tsx
- [ ] Line 134: `bgcolor: '#f5f5f5'` → Use `'grey.100'`

#### DecisionInstanceDetailPage.tsx (12 violations)
- [ ] Line 147: `bgcolor: '#e8f5e9'` → Add to theme as `success.lighter`
- [ ] Line 148: `color: '#2e7d32'` → Use `'success.dark'`
- [ ] Line 231: `bgcolor: '#f5f5f5'` → Use `'grey.100'`
- [ ] Line 261: `borderBottom: '1px solid #e0e0e0'` → Use `'divider'`
- [ ] Line 275: `bgcolor: '#f5f5f5'` → Use `'grey.100'`
- [ ] Line 301: `borderBottom: '1px solid #e0e0e0'` → Use `'divider'`
- [ ] Line 316: `bgcolor: '#e3f2fd'` → Add to theme as `info.lighter`
- [ ] Line 322: `color: '#1976d2'` → Use `'info.main'`
- [ ] Line 328: `bgcolor: '#1976d2'` → Use `'info.main'`
- [ ] Line 363: `bgcolor: '#e8f5e9'` → Use `'success.lighter'`
- [ ] Line 369: `color: '#4caf50'` → Use `'success.main'`
- [ ] Line 375: `bgcolor: '#4caf50'` → Use `'success.main'`

#### DesignPage.tsx (50+ SVG color violations)
- [ ] Lines 10-98: All SVG fill/stroke colors hardcoded
- **Recommendation:** Create themed SVG components or use `themeColors`

### 2.2 Components with Hardcoded Colors

#### XmlEditor.tsx (18 violations - syntax highlighting)
- [ ] Line 15: `'#ffffff'` → `themeColors.bgWhite`
- [ ] Line 23: `'#f5f5f5'` → `themeColors.bgGray`
- [ ] Line 24: `'#e0e0e0'` → `themeColors.borderDark`
- [ ] Line 25: `'#999'` → `themeColors.textMuted`
- [ ] Line 28: `'#f0f7ff'` → Add to theme
- [ ] Line 31: `'#e8f0fe'` → Add to theme
- [ ] Lines 37-48: Syntax highlighting colors (12 colors)
- **Recommendation:** Add `xmlEditor` color group to theme

#### DmnViewer.tsx (13+ violations)
- [ ] Line 244: `'#c8e6c9'` → Add to theme as highlight color
- [ ] Line 247: `'#c8e6c9'` → Same
- [ ] Line 315: `linear-gradient(to bottom, #ffffff, #f8f9fa)` → Use theme colors
- [ ] Line 334: `'#9e9e9e'` → `themeColors.borderMedium`
- [ ] Lines 371, 373: `'#666'` → `themeColors.textSecondary`
- [ ] Line 393: `'#9e9e9e'` → `themeColors.borderMedium`
- [ ] Line 400: `'#9e9e9e'` → Same
- [ ] Line 658: `'#f8f8f8'` → `themeColors.bgLight`
- [ ] Lines 672-678: `'#e8f4fc'`, `'#52b0ec'` → Add to theme

#### PartitionedTable.tsx (8 partition colors)
- [ ] Lines 83-89: Hardcoded color array for partitions
```typescript
// Current
'#5C6BC0', '#26A69A', '#7E57C2', '#42A5F5', '#66BB6A', '#FFA726', '#EC407A', '#8D6E63'
```
- **Recommendation:** Add `partitionColors` array to theme

#### TableWithFilters.tsx (2 violations)
- [ ] Line 307: `'#f0f0f0'` → Use `'divider'`
- [ ] Line 388: `'#f0f0f0'` → Use `'divider'`

#### VersionSwitcher.tsx
- [ ] Line 163: `'#e8eaf6'` → Add to theme or use `'grey.100'`

#### BpmnDiagram.tsx
- [ ] Line 448: `'rgba(0,0,0,0.2)'` → Use theme shadow

#### JobsTab.tsx (types file)
- [ ] ~Line 168: `JOB_STATE_COLORS` fallback `'#9E9E9E'` → Use `themeColors.stateBadge`

---

## 3. CRITICAL: Hardcoded Text (Missing i18n)

**Rule:** All user-facing text MUST use `t('namespace:key')`.

**Status:** [ ] Not Started

### 3.1 HomePage.tsx (8 violations)

- [ ] Line 47: `'Manage BPMN process definitions and view running instances'`
- [ ] Line 51: `label: 'Definitions'`
- [ ] Line 56: `label: 'Instances'`
- [ ] Line 65: `'Manage DMN decision definitions and evaluate decisions'`
- [ ] Line 69: `label: 'Definitions'`
- [ ] Line 74: `label: 'Instances'`
- [ ] Line 83: `'View and resolve process incidents'`
- [ ] Line 115: `'Business Process Management Engine'`

**Translation keys to add to `en/home.json`:**
```json
{
  "subtitle": "Business Process Management Engine",
  "cards": {
    "processes": {
      "description": "Manage BPMN process definitions and view running instances",
      "definitions": "Definitions",
      "instances": "Instances"
    },
    "decisions": {
      "description": "Manage DMN decision definitions and evaluate decisions",
      "definitions": "Definitions",
      "instances": "Instances"
    },
    "incidents": {
      "description": "View and resolve process incidents"
    }
  }
}
```

### 3.2 DateRangePicker.tsx (30+ violations)

- [ ] Line 64: `'Last 15 minutes'`
- [ ] Line 72: `'Last 1 hour'`
- [ ] Line 80: `'Last 24 hours'`
- [ ] Line 88: `'Last 7 days'`
- [ ] Line 96: `'Last 30 days'`
- [ ] Line 104: `'Last 90 days'`
- [ ] Line 112: `'Today'`
- [ ] Line 120: `'This week'`
- [ ] Line 128: `'This month'`
- [ ] Line 136: `'This year'`
- [ ] Line 249, 262: `'Select date range'`
- [ ] Line 334: `'Quick select'`
- [ ] Line 359: `'From'`
- [ ] Line 368, 429: `'Absolute'`
- [ ] Line 371, 432: `'Relative'`
- [ ] Lines 400-404: `'minutes'`, `'hours'`, `'days'`, `'weeks'`, `'months'`
- [ ] Line 408, 469: `'ago'`, `'ago (0 = now)'`
- [ ] Line 420: `'To'`
- [ ] Line 480: `'Clear'`
- [ ] Line 483: `'Apply'`

**Translation keys to add to `en/common.json`:**
```json
{
  "dateRange": {
    "selectRange": "Select date range",
    "quickSelect": "Quick select",
    "from": "From",
    "to": "To",
    "absolute": "Absolute",
    "relative": "Relative",
    "ago": "ago",
    "agoNow": "ago (0 = now)",
    "clear": "Clear",
    "apply": "Apply",
    "presets": {
      "last15Minutes": "Last 15 minutes",
      "last1Hour": "Last 1 hour",
      "last24Hours": "Last 24 hours",
      "last7Days": "Last 7 days",
      "last30Days": "Last 30 days",
      "last90Days": "Last 90 days",
      "today": "Today",
      "thisWeek": "This week",
      "thisMonth": "This month",
      "thisYear": "This year"
    },
    "units": {
      "minutes": "minutes",
      "hours": "hours",
      "days": "days",
      "weeks": "weeks",
      "months": "months"
    }
  }
}
```

### 3.3 DecisionInstanceDetailPage.tsx (6 violations)

- [ ] Line 264: `'Final Output'`
- [ ] Line 329: `'Inputs'`
- [ ] Line 355: `'No inputs'`
- [ ] Line 376: `'Outputs'`
- [ ] Line 402: `'No outputs'`

### 3.4 Error Messages (4 violations)

- [ ] `ProcessDefinitionDetailPage.tsx:222` - `'Process definition not found'`
- [ ] `ProcessInstanceDetailPage.tsx:130` - `'Process instance not found'`
- [ ] `DecisionDefinitionDetailPage.tsx:106` - `'Decision definition not found'`
- [ ] `DecisionInstanceDetailPage.tsx:191` - `'Decision instance not found'`

**Translation keys to add:**
```json
{
  "errors": {
    "processDefinitionNotFound": "Process definition not found",
    "processInstanceNotFound": "Process instance not found",
    "decisionDefinitionNotFound": "Decision definition not found",
    "decisionInstanceNotFound": "Decision instance not found"
  }
}
```

### 3.5 DmnViewer.tsx

- [ ] Line 353: `'Drag to move'` (HTML title attribute)

---

## 4. HIGH: Components Too Large (>300 lines)

**Rule:** Components should be 200-300 lines max. Extract sub-components, hooks, utilities.

**Status:** [ ] Not Started

| Component | Lines | Action Needed |
|-----------|-------|---------------|
| [ ] `DmnViewer.tsx` | 717 | Extract: rendering logic, event handlers, DOM manipulation |
| [ ] `BpmnDiagram.tsx` | 501 | Extract: overlay logic, highlighting logic, zoom controls |
| [ ] `DateRangePicker.tsx` | 492 | Extract: preset definitions, relative/absolute pickers |
| [ ] `PartitionedTable.tsx` | 442 | Extract: partition logic, color generation |
| [ ] `DecisionInstanceDetailPage.tsx` | 413 | Extract: input/output panels, result display |
| [ ] `TableWithFilters.tsx` | 399 | Extract: filter components (already has some) |
| [ ] `DmnEditor.tsx` | 376 | Extract: toolbar, panel configuration |
| [ ] `ProcessDesignerPage.tsx` | 344 | Extract: save logic, toolbar |
| [ ] `ProcessDefinitionDetailPage.tsx` | 344 | Extract: version switcher logic, metadata |
| [ ] `DecisionDesignerPage.tsx` | 342 | Extract: similar to ProcessDesignerPage |
| [ ] `MetadataPanel.tsx` | 326 | Extract: field renderers |
| [ ] `BpmnEditor.tsx` | 311 | Extract: module configuration |

### Suggested Extractions for DmnViewer.tsx (717 lines)

```
src/components/DmnViewer/
├── DmnViewer.tsx              # Main component (~150 lines)
├── hooks/
│   ├── useDmnNavigation.ts    # Zoom, pan, reset logic
│   ├── useDmnHighlighting.ts  # Row/rule highlighting
│   └── useDmnResize.ts        # Resize panel logic
├── components/
│   ├── DmnToolbar.tsx         # Zoom controls, view selector
│   ├── DmnDecisionPanel.tsx   # Side panel with decisions
│   └── DmnResizeHandle.tsx    # Draggable resize handle
└── utils/
    └── dmnStyles.ts           # DOM style utilities
```

---

## 5. HIGH: Missing data-testid Attributes

**Rule:** All interactive elements MUST have `data-testid` for Playwright testing.

**Status:** [ ] Not Started

### Pages Without Test IDs

- [ ] `ProcessDefinitionDetailPage.tsx` - 0 test attributes
- [ ] `ProcessInstanceDetailPage.tsx` - 0 test attributes
- [ ] `DecisionDefinitionDetailPage.tsx` - 0 test attributes
- [ ] `DecisionInstanceDetailPage.tsx` - 0 test attributes
- [ ] `HomePage.tsx` - Partial (only QuickAccessCard)

### Tabs Without Test IDs

- [ ] `JobsTab.tsx` - 0 test attributes
- [ ] `VariablesTab.tsx` - 0 test attributes
- [ ] `HistoryTab.tsx` - 0 test attributes
- [ ] `IncidentsTab.tsx` - 0 test attributes

### Components Without Test IDs

- [ ] Most components in `src/components/`

### Example Test IDs to Add

```typescript
// ProcessInstanceDetailPage.tsx
<Paper data-testid="process-instance-diagram-panel">
<Paper data-testid="process-instance-metadata-panel">
<Tabs data-testid="process-instance-tabs">
<Tab data-testid="process-instance-tab-jobs">
<Tab data-testid="process-instance-tab-history">
<Tab data-testid="process-instance-tab-incidents">
<Tab data-testid="process-instance-tab-variables">
```

---

## 6. MEDIUM: Inline CSS via `.cssText` and `style={}`

**Rule:** Use `sx` prop or styled components, never inline styles.

**Status:** [ ] Not Started

### DmnViewer.tsx (5+ violations)

- [ ] Line 304: `wrapper.style.cssText = '...'`
- [ ] Lines 309-321: `container.style.cssText = '...'` (13 lines of CSS!)
- [ ] Line 325: `borderSvg.style.cssText = '...'`
- [ ] Lines 354-369: `dragHandle.style.cssText = '...'`
- [ ] Lines 371, 373: `handleLine1/2.style.cssText = '...'`

**Note:** These are DOM manipulations for bpmn-js integration. Consider using CSS classes or styled components.

### DesignPage.tsx (2 violations)

- [ ] Line 8: `style={{ width: '100%', height: 120 }}`
- [ ] Line 44: `style={{ width: '100%', height: 120 }}`

---

## 7. MEDIUM: `any` Types

**Rule:** Never use `any`. Use proper types or `unknown` with type guards.

**Status:** [ ] Not Started

### Type Definition Files

#### bpmn-js-properties-panel.d.ts
- [ ] Line 3: `export const BpmnPropertiesPanelModule: any;`
- [ ] Line 5: `export const BpmnPropertiesProviderModule: any;`

#### camunda-bpmn-js.d.ts
- [ ] Line 19: `get(name: string): any;`

#### dmn-js.d.ts
- [ ] Line 8: `get(name: string): any;`
- [ ] Line 15: `get(name: string): any;`
- [ ] Line 42: `additionalModules?: any[];`
- [ ] Line 51: `get(name: string): any;`
- [ ] Line 59: `get(name: string): any;`
- [ ] Line 70: `export const DmnPropertiesPanelModule: any;`
- [ ] Line 72: `export const DmnPropertiesProviderModule: any;`
- [ ] Line 74: `export const CamundaPropertiesProviderModule: any;`

**Note:** These are third-party library types. Consider creating proper interfaces or using `unknown`.

---

## 8. LOW: Hardcoded Font Families

**Rule:** Use theme typography variants.

**Status:** [ ] Not Started

### Files with Hardcoded Monospace Font

Pattern: `fontFamily: '"SF Mono", Monaco, monospace'`

- [ ] `JobsTab.tsx:106`
- [ ] `VariablesTab.tsx:113`
- [ ] `HistoryTab.tsx:28`
- [ ] `DecisionInstanceDetailPage.tsx` (lines 151, 279, 340, 387)
- [ ] `CompleteJobDialog.tsx`
- [ ] `AddVariableDialog.tsx`
- [ ] `EditVariableDialog.tsx`

**Fix:** Add to theme:
```typescript
// src/base/theme/index.ts
typography: {
  // ... existing variants
  mono: {
    fontFamily: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", monospace',
    fontSize: '0.75rem',
  },
}
```

Then use:
```typescript
<Typography variant="mono">{value}</Typography>
// or
sx={{ typography: 'mono' }}
```

---

## 9. LOW: Directory Structure

**Rule:** Detail pages should be nested under parent page directories.

**Status:** [ ] Not Started

### Current Structure (Non-compliant)

```
src/pages/
├── Processes/
├── ProcessDefinitionDetail/    ← Should be under Processes/pages/
├── ProcessInstanceDetail/      ← Should be under Processes/pages/
├── Decisions/
├── DecisionDefinitionDetail/   ← Should be under Decisions/pages/
├── DecisionInstanceDetail/     ← Should be under Decisions/pages/
```

### Expected Structure (Per DEVELOPMENT_RULES.md)

```
src/pages/
├── Processes/
│   ├── ProcessesPage.tsx
│   └── pages/
│       ├── ProcessDefinitionDetail/
│       │   └── ProcessDefinitionDetailPage.tsx
│       └── ProcessInstanceDetail/
│           └── ProcessInstanceDetailPage.tsx
├── Decisions/
│   ├── DecisionsPage.tsx
│   └── pages/
│       ├── DecisionDefinitionDetail/
│       │   └── DecisionDefinitionDetailPage.tsx
│       └── DecisionInstanceDetail/
│           └── DecisionInstanceDetailPage.tsx
```

**Note:** This is a lower priority refactor. The current structure works, but doesn't follow the documented conventions.

---

## Progress Tracking

### Phase 1: Critical Fixes
- [ ] Add theme colors for all hardcoded values
- [ ] Add i18n translations for all hardcoded text
- [ ] Fix inline styles

### Phase 2: High Priority
- [ ] Break up large components (>300 lines)
- [ ] Add data-testid attributes

### Phase 3: Medium Priority
- [ ] Fix `any` types in type definitions
- [ ] Create Storybook stories for components

### Phase 4: Low Priority
- [ ] Add monospace typography variant
- [ ] Restructure directories (optional)

---

## Notes

- When fixing colors, update `src/base/theme/index.ts` first, then reference
- When fixing i18n, add keys to appropriate namespace files in `src/base/i18n/locales/en/`
- Run `pnpm build` after changes to verify no TypeScript errors
- Run `pnpm lint` to catch any ESLint violations

---

## Changelog

| Date | Changes |
|------|---------|
| 2026-01-05 | Initial audit completed |
