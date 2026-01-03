# Frontend Development Rules - MANDATORY

**Project:** zenbpm-ui (React Frontend for ZenBPM)
**Tech Stack:** React 19 + TypeScript + Material UI + Vite
**Purpose:** Admin UI for ZenBPM BPMN/DMN platform

---

## PROJECT STRUCTURE - CRITICAL

### Directory Organization (ALWAYS follow this)

```
src/
├── base/                                ← Global utilities & configuration
│   ├── contexts/                       ← Global React contexts
│   ├── hooks/                          ← Global custom hooks
│   ├── theme/                          ← MUI theme configuration
│   ├── i18n/                           ← i18next configuration & translations
│   │   └── locales/
│   │       ├── en/                     ← English translations
│   │       │   ├── common.json
│   │       │   ├── processes.json
│   │       │   ├── decisions.json
│   │       │   └── incidents.json
│   │       └── cs/                     ← Czech translations
│   ├── router/                         ← React Router configuration
│   └── openapi/                        ← API client (generated, DO NOT EDIT)
│       ├── axios-instance.ts           ← Axios configuration
│       └── generated-api/              ← Generated from OpenAPI spec
│           ├── api.schemas.ts          ← Type definitions
│           └── [endpoint]/             ← API hooks per endpoint
│
├── components/                          ← Reusable components (NOT pages)
│   ├── BpmnViewer/
│   │   ├── BpmnViewer.tsx              ← Main component
│   │   ├── BpmnViewer.stories.tsx      ← Storybook story
│   │   ├── components/                 ← Sub-components (if needed)
│   │   │   ├── ElementOverlay.tsx
│   │   │   └── TokenMarker.tsx
│   │   ├── hooks/                      ← Component-specific hooks
│   │   │   └── useBpmnCanvas.ts
│   │   └── types/                      ← Component-specific types
│   │       └── bpmn.types.ts
│   │
│   ├── DataTable/
│   │   ├── DataTable.tsx
│   │   ├── DataTable.stories.tsx
│   │   └── components/
│   │       ├── TableHeader.tsx
│   │       ├── TablePagination.tsx
│   │       └── PartitionTabs.tsx       ← Partition tab navigation
│   │
│   ├── JsonEditor/
│   │   ├── JsonEditor.tsx
│   │   └── JsonEditor.stories.tsx
│   │
│   └── StateBadge/
│       ├── StateBadge.tsx              ← State badges (active, completed, etc.)
│       └── StateBadge.stories.tsx
│
│   RULES:
│   - Components here are REUSABLE across different pages
│   - Each component gets its own directory
│   - Must have a Storybook story (.stories.tsx)
│   - Use subfolders only when component is complex
│
└── pages/                               ← Page components (mapped to routes)
    ├── Home/
    │   ├── HomePage.tsx                 ← Route: /
    │   └── components/
    │       └── WelcomeCard.tsx
    │
    ├── Login/
    │   ├── LoginPage.tsx                ← Route: /login
    │   ├── hooks/
    │   │   └── useKeycloakAuth.ts
    │   └── components/
    │       └── LoginForm.tsx
    │
    ├── ProcessDefinitions/
    │   ├── ProcessDefinitionsPage.tsx   ← Route: /process-definitions
    │   │
    │   ├── components/                 ← Page-specific components
    │   │   ├── LatestVersionToggle.tsx
    │   │   └── ProcessStats.tsx
    │   │
    │   ├── table/                      ← Table-related components
    │   │   ├── ProcessDefinitionsTable.tsx
    │   │   ├── columns.tsx             ← Column definitions
    │   │   └── filters.tsx             ← Filter components
    │   │
    │   ├── hooks/                      ← Page-specific hooks
    │   │   ├── useProcessDefinitions.ts
    │   │   └── useVersionFilter.ts
    │   │
    │   ├── modals/                     ← Page-specific modals
    │   │   ├── UploadBpmnModal.tsx
    │   │   └── CreateProcessModal.tsx
    │   │
    │   └── pages/                      ← SUBPAGES (nested routes)
    │       └── ProcessDefinitionDetail/
    │           ├── ProcessDefinitionDetailPage.tsx  ← Route: /process-definitions/:key
    │           ├── components/
    │           │   ├── VersionSwitcher.tsx
    │           │   └── StartInstanceDialog.tsx
    │           ├── hooks/
    │           │   └── useProcessVersions.ts
    │           └── tabs/
    │               ├── DiagramTab.tsx
    │               └── InstancesTab.tsx
    │
    ├── ProcessInstances/
    │   ├── ProcessInstancesPage.tsx     ← Route: /process-instances
    │   ├── table/
    │   │   ├── ProcessInstancesTable.tsx
    │   │   ├── columns.tsx
    │   │   └── filters.tsx
    │   ├── hooks/
    │   │   ├── useProcessInstances.ts
    │   │   └── usePartitionCounts.ts
    │   └── pages/
    │       └── ProcessInstanceDetail/
    │           ├── ProcessInstanceDetailPage.tsx  ← Route: /process-instances/:key
    │           ├── components/
    │           │   └── InstanceMetadata.tsx
    │           ├── hooks/
    │           │   └── useInstanceData.ts
    │           └── tabs/
    │               ├── JobsTab.tsx
    │               ├── ActivitiesTab.tsx
    │               ├── HistoryTab.tsx
    │               ├── IncidentsTab.tsx
    │               ├── VariablesTab.tsx
    │               └── UserTasksTab.tsx
    │
    ├── Incidents/
    │   ├── IncidentsPage.tsx            ← Route: /incidents
    │   ├── table/
    │   ├── hooks/
    │   └── modals/
    │       └── IncidentDetailModal.tsx
    │
    ├── BusinessRules/
    │   ├── BusinessRulesPage.tsx        ← Route: /business-rules
    │   ├── table/
    │   ├── modals/
    │   │   └── UploadDmnModal.tsx
    │   └── pages/
    │       └── BusinessRuleDetail/
    │           ├── BusinessRuleDetailPage.tsx  ← Route: /business-rules/:key
    │           ├── components/
    │           │   ├── DrdViewer.tsx
    │           │   └── DecisionTableView.tsx
    │           └── tabs/
    │               └── EvaluationsTab.tsx
    │
    └── Tasklist/
        ├── TasklistPage.tsx             ← Route: /tasklist
        ├── components/
        │   └── TaskForm.tsx
        └── hooks/
            └── useUserTasks.ts
```

### When to Use Each Folder:

| Folder | Use When | Example |
|--------|----------|---------|
| `pages/` | Component is mapped to a route | `ProcessDefinitionsPage.tsx` -> `/process-definitions` |
| `pages/X/pages/` | Nested route, subpage | `ProcessDefinitionDetailPage.tsx` -> `/process-definitions/:key` |
| `pages/X/tabs/` | Page has tabs (sub-sections) | `JobsTab.tsx`, `VariablesTab.tsx` |
| `pages/X/components/` | Component used ONLY in this page | `VersionSwitcher.tsx` only in ProcessDefinitionDetail |
| `pages/X/table/` | Table-related (columns, filters) | `ProcessDefinitionsTable.tsx`, `columns.tsx` |
| `pages/X/modals/` | Modals used ONLY in this page | `StartInstanceDialog.tsx` |
| `pages/X/hooks/` | Hooks used ONLY in this page | `useProcessVersions.ts` |
| `components/` | Reusable across MULTIPLE pages | `BpmnViewer.tsx`, `DataTable.tsx` |
| `components/X/components/` | Sub-components of reusable component | `ElementOverlay.tsx` inside `BpmnViewer/` |

---

## PAGE NAMING - CRITICAL RULE

### CORRECT - Always Add "Page" Suffix
```typescript
// ALWAYS DO THIS
pages/
├── ProcessDefinitions/
│   └── ProcessDefinitionsPage.tsx    // CORRECT NAME WITH "Page" SUFFIX
│       export const ProcessDefinitionsPage = () => { ... }

// Route configuration
<Route path="/process-definitions" element={<ProcessDefinitionsPage />} />
```

### WRONG - Missing "Page" Suffix
```typescript
// NEVER DO THIS
pages/
├── ProcessDefinitions/
│   └── ProcessDefinitions.tsx        // WRONG - MISSING "Page" SUFFIX
```

### Naming Convention Table:

| Route | Directory | File | Component Export |
|-------|-----------|------|------------------|
| `/` | `Home/` | `HomePage.tsx` | `export const HomePage` |
| `/login` | `Login/` | `LoginPage.tsx` | `export const LoginPage` |
| `/process-definitions` | `ProcessDefinitions/` | `ProcessDefinitionsPage.tsx` | `export const ProcessDefinitionsPage` |
| `/process-definitions/:key` | `ProcessDefinitions/pages/ProcessDefinitionDetail/` | `ProcessDefinitionDetailPage.tsx` | `export const ProcessDefinitionDetailPage` |
| `/process-instances` | `ProcessInstances/` | `ProcessInstancesPage.tsx` | `export const ProcessInstancesPage` |
| `/process-instances/:key` | `ProcessInstances/pages/ProcessInstanceDetail/` | `ProcessInstanceDetailPage.tsx` | `export const ProcessInstanceDetailPage` |
| `/incidents` | `Incidents/` | `IncidentsPage.tsx` | `export const IncidentsPage` |
| `/business-rules` | `BusinessRules/` | `BusinessRulesPage.tsx` | `export const BusinessRulesPage` |
| `/business-rules/:key` | `BusinessRules/pages/BusinessRuleDetail/` | `BusinessRuleDetailPage.tsx` | `export const BusinessRuleDetailPage` |

**Rule:** Page components MUST have "Page" suffix for easy searching and identification

---

## NON-NEGOTIABLE RULES

### TypeScript - No 'any' Type
```typescript
// NEVER use 'any'
const processData: any = await fetchData();  // NEVER

// ALWAYS use proper types or 'unknown' with type guards
const processData: unknown = await fetchData();
if (isProcessData(processData)) {  // Type guard
    // Now TypeScript knows the type
}

// BETTER - Use generated types
import type { ProcessDefinitionSimple } from '@base/openapi/generated-api/api.schemas';
const processData: ProcessDefinitionSimple = await fetchData();
```

### Styling - Never Hardcode Colors
```typescript
// NEVER hardcode colors - not in sx props, not anywhere
<Box sx={{ color: '#1976d2', backgroundColor: 'white' }}>  // NEVER
<Box sx={{ color: 'rgba(25, 118, 210, 0.8)' }}>  // NEVER
const myColor = '#4caf50';  // NEVER

// ALWAYS use theme via sx prop
<Box sx={{
    color: 'primary.main',           // CORRECT
    backgroundColor: 'background.paper'  // CORRECT
}}>

// Or access theme directly in sx prop
<Box sx={(theme) => ({
    color: theme.palette.primary.main,
    backgroundColor: theme.palette.background.paper
})}>

// For non-MUI code (e.g., CSS-in-JS, canvas, SVG), use themeColors export
import { themeColors } from '@base/theme';

// Then use the colors
const styles = {
    stroke: themeColors.bpmn.activeStroke,
    fill: themeColors.primary,
    glow: themeColors.bpmn.selectionGlow,
};
```

**All colors MUST be defined in `src/base/theme/index.ts`:**
- General colors: `primary`, `error`, `success`, `warning`, `info`
- Text colors: `textPrimary`, `textSecondary`, `textMuted`
- Background colors: `bgWhite`, `bgLight`, `bgGray`, `bgHover`
- Border colors: `borderLight`, `borderMedium`, `borderDark`
- BPMN diagram colors: `bpmn.runningBadge`, `bpmn.activeStroke`, `bpmn.selectionGlow`, etc.

If you need a new color, add it to the theme file first, then use it.

### Styling - Never Use Inline Styles
```typescript
// NEVER use inline styles
<div style={{ padding: '16px', margin: '8px' }}>  // NEVER

// ALWAYS use sx prop
<Box sx={{ p: 2, m: 1 }}>  // CORRECT

// Or styled components
const StyledBox = styled(Box)(({ theme }) => ({
    padding: theme.spacing(2),
    margin: theme.spacing(1)
}));
```

### Never Use Plain HTML Elements
```typescript
// NEVER use plain div, span, etc.
<div className="container">
    <span>Hello</span>
</div>

// ALWAYS use MUI Box with component prop
<Box component="div" className="container">
    <Box component="span">Hello</Box>
</Box>
```

### i18n - Never Hardcode Text
```typescript
// NEVER hardcode user-facing text
<Button>Create Process</Button>  // NEVER
<Typography>Welcome to ZenBPM</Typography>  // NEVER

// ALWAYS use i18next
<Button>{t('processes:actions.create')}</Button>  // CORRECT
<Typography>{t('common:welcome')}</Typography>  // CORRECT
```

### API Generation - Never Modify Generated Code
```typescript
// NEVER edit files in generated-api/
src/base/openapi/generated-api/
└── api.schemas.ts  // DO NOT EDIT THIS FILE

// If you need changes, update backend OpenAPI spec and regenerate
// Run: pnpm generate:api
```

---

## CODING STANDARDS

### Import Organization
```typescript
// CORRECT import order
// 1. React
import { useState, useEffect, useCallback } from 'react';

// 2. External libraries
import { Box, Button, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

// 3. Local imports (use path aliases)
import { useGetProcessDefinitions } from '@base/openapi/generated-api/process-definition';
import { BpmnViewer } from '@components/BpmnViewer';
import { ProcessCard } from './components/ProcessCard';
import type { ProcessFilters } from './types/filters.types';
```

### Component Structure
```typescript
// CORRECT component structure
import { useState, useCallback } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { ProcessDefinitionSimple } from '@base/openapi/generated-api/api.schemas';

// 1. Props interface at top
interface ProcessDefinitionsPageProps {
    initialFilter?: string;
    onProcessSelect?: (key: number) => void;
}

// 2. Component
export const ProcessDefinitionsPage = ({
    initialFilter,
    onProcessSelect
}: ProcessDefinitionsPageProps) => {
    const { t } = useTranslation();

    // 3. State
    const [filter, setFilter] = useState(initialFilter);
    const [onlyLatest, setOnlyLatest] = useState(true);

    // 4. Hooks (queries, mutations)
    const { data, isLoading, error } = useGetProcessDefinitions({
        onlyLatest,
        page: 0,
        size: 20
    });

    // 5. Event handlers
    const handleProcessClick = useCallback((process: ProcessDefinitionSimple) => {
        onProcessSelect?.(process.key);
    }, [onProcessSelect]);

    // 6. Early returns for loading/error states
    if (isLoading) {
        return <Box>Loading...</Box>;
    }

    if (error) {
        return <Box color="error.main">{t('common:errors.loadFailed')}</Box>;
    }

    // 7. Render
    return (
        <Box>
            <Typography variant="h4">{t('processes:title')}</Typography>
            {/* ... */}
        </Box>
    );
};
```

### Custom Hooks
```typescript
// CORRECT custom hook pattern
import { useState, useCallback } from 'react';
import { useGetProcessInstances } from '@base/openapi/generated-api/process-instance';

interface ProcessFilters {
    search: string;
    state: 'all' | 'active' | 'completed' | 'terminated';
    partition?: number;
    hasIncident?: boolean;
}

export const useProcessFilters = (processDefinitionKey?: number) => {
    const [filters, setFilters] = useState<ProcessFilters>({
        search: '',
        state: 'all'
    });

    const handleFilterChange = useCallback(<K extends keyof ProcessFilters>(
        key: K,
        value: ProcessFilters[K]
    ) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    }, []);

    const resetFilters = useCallback(() => {
        setFilters({ search: '', state: 'all' });
    }, []);

    return { filters, handleFilterChange, resetFilters };
};
```

### Exports
```typescript
// PREFER named exports
export const ProcessDefinitionsPage = () => { ... }
export const ProcessCard = () => { ... }

// AVOID default exports (makes refactoring harder)
export default ProcessDefinitionsPage;  // Avoid
```

---

## MATERIAL UI GUIDELINES

### Using Theme
```typescript
// Method 1: String notation (recommended for simple cases)
<Box sx={{
    color: 'primary.main',
    bgcolor: 'background.paper',
    p: 2,  // padding: theme.spacing(2)
    m: 1   // margin: theme.spacing(1)
}}>

// Method 2: Theme function (for complex logic)
<Box sx={(theme) => ({
    color: theme.palette.primary.main,
    padding: theme.spacing(2),
    [theme.breakpoints.down('md')]: {
        padding: theme.spacing(1)
    }
})}>
```

### Responsive Design
```typescript
// ALWAYS make components responsive
<Box sx={{
    display: { xs: 'block', md: 'flex' },  // Mobile: block, Desktop: flex
    p: { xs: 1, sm: 2, md: 3 },           // Responsive padding
    width: { xs: '100%', md: '50%' }       // Responsive width
}}>
```

### Component Prop
```typescript
// Use component prop to change HTML element
<Box component="section">Section content</Box>
<Box component="article">Article content</Box>
<Box component="span" display="inline">Inline text</Box>
```

---

## ZENBPM-SPECIFIC PATTERNS

### Partition Tabs Pattern
Many ZenBPM screens have partition-aware data. Use this pattern:

```typescript
interface PartitionTabsProps {
    partitionCounts: Record<string, number>;
    selectedPartition: number | null;  // null = All Partitions
    onPartitionChange: (partition: number | null) => void;
}

export const PartitionTabs = ({
    partitionCounts,
    selectedPartition,
    onPartitionChange
}: PartitionTabsProps) => {
    const { t } = useTranslation();
    const totalCount = Object.values(partitionCounts).reduce((a, b) => a + b, 0);

    return (
        <Box>
            <Tabs value={selectedPartition ?? 'all'} onChange={(_, v) => onPartitionChange(v === 'all' ? null : v)}>
                <Tab
                    value="all"
                    label={`${t('common:allPartitions')} (${totalCount})`}
                />
                {Object.entries(partitionCounts).map(([partition, count]) => (
                    <Tab
                        key={partition}
                        value={Number(partition)}
                        label={`${t('common:partition')} ${partition} (${count})`}
                        disabled={count === 0}
                    />
                ))}
            </Tabs>

            {/* Warning when viewing all partitions */}
            {selectedPartition === null && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                    {t('common:clientSideSortingWarning')}
                </Alert>
            )}
        </Box>
    );
};
```

### BPMN Diagram with History Visualization
```typescript
interface BpmnDiagramProps {
    xml: string;
    history?: Array<{ elementId: string }>;  // Completed elements (green path)
    activeElements?: Array<{ elementId: string }>;  // Currently active (blue)
    selectedElement?: string;  // Filter highlight
    onElementClick?: (elementId: string) => void;
}

// Use the BpmnDiagram component from @components/BpmnDiagram
// It handles all visualization automatically
```

### State Badges
Use consistent state visualization:

```typescript
type ProcessState = 'active' | 'completed' | 'terminated';
type IncidentState = 'resolved' | 'unresolved';
type JobState = 'activatable' | 'activated' | 'completed' | 'failed';

// State colors (use theme)
const stateColors = {
    active: 'primary.main',
    completed: 'success.main',
    terminated: 'error.main',
    resolved: 'success.main',
    unresolved: 'error.main',
    activatable: 'info.main',
    activated: 'warning.main',
    failed: 'error.main'
};
```

---

## API CLIENT USAGE

### Using Generated Hooks
```typescript
import {
    useGetProcessDefinitions,
    useGetProcessDefinition,
    usePostProcessDefinitions
} from '@base/openapi/generated-api/process-definition';

export const ProcessDefinitionsPage = () => {
    // GET list with filters
    const { data, isLoading, error, refetch } = useGetProcessDefinitions({
        page: 0,
        size: 20,
        onlyLatest: true,
        sortBy: 'name',
        sortOrder: 'asc'
    });

    // POST mutation
    const deployMutation = usePostProcessDefinitions();

    const handleDeploy = async (bpmnXml: string) => {
        try {
            await deployMutation.mutateAsync({ data: bpmnXml });
            refetch();  // Refresh list
        } catch (error) {
            // Handle error
        }
    };

    if (isLoading) return <CircularProgress />;
    if (error) return <Alert severity="error">{t('common:errors.loadFailed')}</Alert>;

    return (
        <Box>
            {data?.items.map(process => (
                <ProcessCard key={process.key} process={process} />
            ))}
        </Box>
    );
};
```

### Using Generated Types
```typescript
import type {
    ProcessDefinitionSimple,
    ProcessDefinitionsPage,
    ProcessInstance,
    Incident,
    DecisionDefinition,
    UserTask
} from '@base/openapi/generated-api/api.schemas';

interface ProcessListProps {
    processes: ProcessDefinitionSimple[];
    onSelect: (process: ProcessDefinitionSimple) => void;
}
```

---

## INTERNATIONALIZATION (i18n)

### Translation File Structure
```
src/base/i18n/locales/
├── en/
│   ├── common.json         # Common (buttons, errors, pagination, etc.)
│   ├── processes.json      # Process definitions & instances
│   ├── decisions.json      # DMN decisions & evaluations
│   ├── incidents.json      # Incidents
│   ├── jobs.json           # Jobs
│   └── auth.json           # Authentication/login
└── cs/
    ├── common.json
    └── ...
```

### Translation Keys Example
```json
// src/base/i18n/locales/en/processes.json
{
    "title": "Process Definitions",
    "instancesTitle": "Process Instances",
    "fields": {
        "name": "Name",
        "bpmnProcessId": "BPMN Process ID",
        "resourceName": "Resource Name",
        "version": "Version",
        "key": "Key",
        "createdAt": "Created At",
        "state": "State",
        "partition": "Partition"
    },
    "states": {
        "active": "Active",
        "completed": "Completed",
        "terminated": "Terminated"
    },
    "actions": {
        "create": "Create Process",
        "upload": "Upload BPMN",
        "deploy": "Deploy",
        "startInstance": "Start Instance",
        "viewDiagram": "View Diagram",
        "cancel": "Cancel Instance"
    },
    "filters": {
        "onlyLatest": "Show only latest versions",
        "dateRange": "Date Range",
        "hasIncident": "Has Incidents"
    },
    "messages": {
        "deploySuccess": "Process deployed successfully",
        "deployError": "Failed to deploy process",
        "startSuccess": "Process instance started",
        "startError": "Failed to start process instance"
    }
}

// src/base/i18n/locales/en/common.json
{
    "allPartitions": "All Partitions",
    "partition": "Partition",
    "clientSideSortingWarning": "When viewing all partitions, sorting is done client-side and may not reflect true ordering across the cluster.",
    "actions": {
        "save": "Save",
        "cancel": "Cancel",
        "delete": "Delete",
        "edit": "Edit",
        "refresh": "Refresh",
        "apply": "Apply",
        "clear": "Clear"
    },
    "pagination": {
        "rowsPerPage": "Rows per page",
        "of": "of"
    },
    "errors": {
        "loadFailed": "Failed to load data",
        "saveFailed": "Failed to save",
        "networkError": "Network error"
    }
}
```

### Using Translations
```typescript
import { useTranslation } from 'react-i18next';

export const ProcessDefinitionsPage = () => {
    const { t } = useTranslation();

    return (
        <Box>
            {/* With namespace */}
            <Typography variant="h4">{t('processes:title')}</Typography>
            <Button>{t('processes:actions.create')}</Button>

            {/* Common namespace */}
            <Button>{t('common:actions.save')}</Button>
            <Button>{t('common:actions.cancel')}</Button>

            {/* With interpolation */}
            <Typography>
                {t('common:pagination.rowsPerPage')}: 10 {t('common:pagination.of')} 100
            </Typography>
        </Box>
    );
};
```

---

## API GENERATION WORKFLOW

### When Backend Changes OpenAPI Spec:

1. **Regenerate API client:**
   ```bash
   cd zenbpm-ui
   pnpm generate:api
   ```

2. **What gets regenerated:**
   ```
   src/base/openapi/generated-api/
   ├── api.schemas.ts              # Type definitions
   └── [endpoint]/
       └── [endpoint].ts           # React Query hooks
   ```

3. **Update your code:**
   - Update components to use new types
   - Update API hook calls if parameters changed
   - Update translations if new fields added

### NEVER Modify Generated Code
```typescript
// NEVER edit these files
src/base/openapi/generated-api/
├── api.schemas.ts              // DO NOT EDIT
└── process-definition/
    └── process-definition.ts   // DO NOT EDIT

// If you need changes:
// 1. Update backend OpenAPI spec (git/zenbpm/openapi/api.yaml)
// 2. Backend regenerates their code
// 3. You run: pnpm generate:api
```

---

## TESTING WITH PLAYWRIGHT

### Test Structure
```
tests/
├── e2e/
│   ├── specs/
│   │   ├── login.spec.ts
│   │   ├── process-definitions.spec.ts
│   │   ├── process-instances.spec.ts
│   │   ├── incidents.spec.ts
│   │   └── business-rules.spec.ts
│   ├── page-objects/
│   │   ├── BasePage.ts
│   │   ├── LoginPage.ts
│   │   ├── ProcessDefinitionsPage.ts
│   │   └── index.ts
│   ├── fixtures/
│   │   └── test-data.ts
│   └── utils/
│       └── test-helpers.ts
```

### Page Object Pattern
```typescript
// page-objects/ProcessDefinitionsPage.ts
export class ProcessDefinitionsPagePO extends BasePage {
    readonly latestVersionToggle: Locator;
    readonly dataTable: Locator;
    readonly searchInput: Locator;

    constructor(page: Page) {
        super(page);
        this.latestVersionToggle = page.locator('[data-testid="latest-version-toggle"]');
        this.dataTable = page.locator('[data-testid="process-definitions-table"]');
        this.searchInput = page.locator('[data-testid="search-input"]');
    }

    async toggleLatestVersion() {
        await this.latestVersionToggle.click();
        await this.waitForAPIResponse(/process-definitions/, 'GET');
    }
}
```

### Test Data Attributes
```typescript
// ALWAYS use data-testid for test selectors
<Button data-testid="deploy-button">{t('processes:actions.deploy')}</Button>

// Test
const deployButton = page.locator('[data-testid="deploy-button"]');
```

---

## CHECKLIST FOR NEW PAGES

When creating a new page:

- [ ] Page name has "Page" suffix
- [ ] Created in correct directory: `src/pages/RouteName/`
- [ ] File named: `RouteNamePage.tsx`
- [ ] Export: `export const RouteNamePage`
- [ ] Added route in router config
- [ ] All text uses i18next: `{t('namespace:key')}`
- [ ] All colors from theme (no hardcoded)
- [ ] All styles via sx prop (no inline)
- [ ] Using MUI Box (no plain div/span)
- [ ] No 'any' types (using proper types)
- [ ] Responsive design (tested mobile + desktop)
- [ ] Using generated API types
- [ ] Added data-testid attributes for testing
- [ ] Created subfolders if needed:
    - [ ] `components/` for page-specific components
    - [ ] `hooks/` for page-specific hooks
    - [ ] `table/` for table components
    - [ ] `modals/` for modals
    - [ ] `tabs/` for tab content
    - [ ] `pages/` for subpages

---

## CHECKLIST FOR NEW COMPONENTS

When creating a new reusable component:

- [ ] Created in `src/components/ComponentName/`
- [ ] File named: `ComponentName.tsx`
- [ ] Created Storybook story: `ComponentName.stories.tsx`
- [ ] Props interface defined at top
- [ ] Using TypeScript strict mode (no 'any')
- [ ] All text uses i18next (if component shows text)
- [ ] All colors from theme
- [ ] All styles via sx prop or styled components
- [ ] Using MUI components (no plain HTML)
- [ ] Responsive design
- [ ] Added data-testid attributes
- [ ] Created subfolders if needed

---

## COMMON MISTAKES TO AVOID

| Wrong | Correct |
|-------|---------|
| `ProcessDefinitions.tsx` | `ProcessDefinitionsPage.tsx` |
| `export default ProcessDefinitionsPage` | `export const ProcessDefinitionsPage` |
| `<div>Text</div>` | `<Box component="div">Text</Box>` |
| `style={{ color: 'blue' }}` | `sx={{ color: 'primary.main' }}` |
| `sx={{ color: '#1976d2' }}` | `sx={{ color: 'primary.main' }}` or `themeColors.primary` |
| `const color = 'rgba(25,118,210,0.8)'` | `const color = themeColors.bpmn.selectionGlow` |
| `<Button>Create</Button>` | `<Button>{t('actions.create')}</Button>` |
| `const data: any` | `const data: ProcessDefinition` |
| Component in wrong folder | Follow structure rules |
| Editing generated API code | Regenerate from backend |
| Hardcoded partition logic | Use PartitionTabs component |

---

## PATH ALIASES

Use these path aliases (configured in vite.config.ts and tsconfig.json):

```typescript
// Use aliases for cleaner imports
import { Button } from '@components/Button';
import { useAuth } from '@base/hooks/useAuth';
import { theme } from '@base/theme';
import { useGetProcessDefinitions } from '@base/openapi/generated-api/process-definition';

// Avoid deep relative paths
import { Button } from '../../../components/Button';  // HARDER TO READ
```

---

## REFERENCES

- **Analysis Mockups:** `analysis/mockups/*.html`
- **Screen Requirements:** `analysis/data/screens.json`
- **API Specifications:** `analysis/data/apis.json`
- **Backend OpenAPI:** `git/zenbpm/openapi/api.yaml`
- **MUI Documentation:** https://mui.com/
- **React Query:** https://tanstack.com/query/latest
- **i18next:** https://react.i18next.com/
- **bpmn-js:** https://bpmn.io/toolkit/bpmn-js/
- **dmn-js:** https://bpmn.io/toolkit/dmn-js/

---

## Summary

**DO:**
- Name pages with "Page" suffix
- Follow directory structure exactly
- Use MUI theme for all colors
- Use sx prop for all styles
- Use MUI Box instead of div/span
- Use i18next for all text
- Use TypeScript properly (no 'any')
- Use generated API types and hooks
- Make everything responsive
- Add data-testid for testing
- Run `pnpm generate:api` when backend changes
- Use PartitionTabs for partition-aware views
- Use consistent state badges

**DON'T:**
- Hardcode colors (hex, rgb, rgba) - add to theme file first
- Use inline styles
- Use plain HTML elements
- Hardcode user-facing text
- Use 'any' type
- Modify generated API code
- Put files in wrong directories
- Skip responsive design
- Guess where files should go

**Project structure is not negotiable. Every file has a specific place based on its purpose.**
