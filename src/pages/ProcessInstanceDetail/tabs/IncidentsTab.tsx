import { useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import { Box, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { DataTable, type Column, type DataTableSection } from '@components/DataTable';
import { StateBadge } from '@components/StateBadge';
import { useIncidentDetailModal } from '@components/IncidentsTable/components/useIncidentDetailModal';
import { useStackTraceModal } from '@components/IncidentsTable/components/useStackTraceModal';
import { getIncidentColumns } from '@components/IncidentsTable/table/columns';
import type { Incident } from '@components/IncidentsTable';
import { resolveIncident } from '@base/openapi';
import type { GetIncidentsState } from '@base/openapi/generated-api/schemas/getIncidentsState';
import type { ProcessInstanceNode } from '../types/tree';

// processType display order — determines section ordering after the main instance
const PROCESS_TYPE_ORDER: Record<string, number> = {
  default: 0,
  callActivity: 1,
  subprocess: 2,
  multiInstance: 3,
};

export type IncidentsTabState = GetIncidentsState | 'all';

interface IncidentsTabProps {
  instanceTree: ProcessInstanceNode | null;
  incidentsPage: number;
  incidentsPageSize: number;
  incidentsState: IncidentsTabState;
  setIncidentsPage: (page: number) => void;
  setIncidentsPageSize: (size: number) => void;
  setIncidentsState: (state: IncidentsTabState) => void;
  onRefetch?: () => Promise<void>;
  onShowNotification?: (message: string, severity: 'success' | 'error') => void;
  /** Called when an element ID cell is clicked — used to highlight the element in the diagram. */
  onElementIdClick?: (elementId: string) => void;
}

/** BFS walk — returns all nodes, root first */
function collectNodes(root: ProcessInstanceNode): ProcessInstanceNode[] {
  const result: ProcessInstanceNode[] = [];
  const queue: ProcessInstanceNode[] = [root];
  while (queue.length > 0) {
    const node = queue.shift();
    if (node === undefined) continue;
    result.push(node);
    queue.push(...node.children);
  }
  return result;
}

export const IncidentsTab = ({
  instanceTree,
  incidentsPage,
  incidentsPageSize,
  incidentsState,
  setIncidentsPage,
  setIncidentsPageSize,
  setIncidentsState,
  onRefetch,
  onShowNotification,
  onElementIdClick,
}: IncidentsTabProps) => {
  const { t } = useTranslation([ns.common, ns.incidents, ns.processes, ns.processInstance]);

  const { openIncidentDetail } = useIncidentDetailModal();
  const { openStackTrace } = useStackTraceModal();

  const handleResolveIncident = useCallback(async (incidentKey: string) => {
    try {
      await resolveIncident(incidentKey);
      onShowNotification?.(t('incidents:messages.resolved'), 'success');
    } catch {
      // Silently continue — resolve may have succeeded with a new incident created
    } finally {
      await onRefetch?.();
    }
  }, [t, onShowNotification, onRefetch]);

  const handleViewDetails = useCallback((incident: Incident) => {
    openIncidentDetail({
      incident,
      onResolve: incident.resolvedAt ? undefined : (incidentKey) => {
        void handleResolveIncident(incidentKey);
      },
    });
  }, [openIncidentDetail, handleResolveIncident]);

  const handleMessageClick = useCallback((message: string) => {
    openStackTrace({ message });
  }, [openStackTrace]);

  const columns: Column<Incident>[] = useMemo(
    () =>
      getIncidentColumns(t, {
        onViewDetails: handleViewDetails,
        onResolve: (incidentKey) => void handleResolveIncident(incidentKey),
        onMessageClick: handleMessageClick,
        onElementIdClick,
      }),
    [t, handleViewDetails, handleResolveIncident, handleMessageClick, onElementIdClick]
  );

  // Build sections from the server-fetched data — no client-side slicing or filtering.
  // Pagination and state filtering are handled server-side; page/state changes trigger API refetch for all nodes.
  const { sections, flatData, totalCount } = useMemo(() => {
    if (!instanceTree) return { sections: undefined, flatData: [], totalCount: 0 };

    const nodes = collectNodes(instanceTree);
    const rootNode = nodes[0];
    const childNodes = nodes.slice(1).sort((a, b) => {
      const typeA = a.instance.processType ?? '';
      const typeB = b.instance.processType ?? '';
      const orderA = PROCESS_TYPE_ORDER[typeA] ?? 99;
      const orderB = PROCESS_TYPE_ORDER[typeB] ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      return a.instance.key.localeCompare(b.instance.key);
    });
    const orderedNodes = [rootNode, ...childNodes];

    const hasChildWithIncidents = childNodes.some(
      (n) => n.incidents.length > 0 || n.incidentsTotalCount > 0
    );

    // totalCount = max across all nodes so the paginator covers the largest section
    const maxTotal = Math.max(...orderedNodes.map((n) => n.incidentsTotalCount), 0);

    if (!hasChildWithIncidents) {
      return { sections: undefined, flatData: rootNode.incidents, totalCount: maxTotal };
    }

    // Sections path
    const result: DataTableSection<Incident>[] = [];
    for (const node of orderedNodes) {
      if (node.incidents.length === 0 && node.incidentsTotalCount === 0) continue;
      const isRoot = node === rootNode;
      const label = isRoot
        ? ''
        : `${node.instance.processType ? t(`processes:types.${node.instance.processType}`) : t('processInstance:fields.childProcess')}: ${node.instance.key}`;
      result.push({
        label,
        callPath: isRoot ? undefined : node.callPath,
        data: node.incidents,
      });
    }

    return { sections: result.length > 0 ? result : undefined, flatData: [], totalCount: maxTotal };
  }, [instanceTree, t]);

  // State filter toolbar
  const toolbar = useMemo(() => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
      <FormControl size="small" sx={{ minWidth: 200 }}>
        <InputLabel>{t('incidents:fields.state')}</InputLabel>
        <Select
          value={incidentsState}
          label={t('incidents:fields.state')}
          onChange={(e) => {
            setIncidentsState(e.target.value as IncidentsTabState);
            setIncidentsPage(0);
          }}
          onClose={() => {
            setTimeout(() => {
              (document.activeElement as HTMLElement)?.blur();
            }, 0);
          }}
          renderValue={(val) => {
            if (val === 'all') return <em>{t('common:filters.all')}</em>;
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', lineHeight: 1 }}>
                <StateBadge
                  state={val}
                  label={t(`incidents:states.${val}`)}
                />
              </Box>
            );
          }}
        >
          <MenuItem value="all">
            <em>{t('common:filters.all')}</em>
          </MenuItem>
          <MenuItem value="unresolved">
            <Box sx={{ display: 'flex', alignItems: 'center', lineHeight: 1 }}>
              <StateBadge state="unresolved" label={t('incidents:states.unresolved')} />
            </Box>
          </MenuItem>
          <MenuItem value="resolved">
            <Box sx={{ display: 'flex', alignItems: 'center', lineHeight: 1 }}>
              <StateBadge state="resolved" label={t('incidents:states.resolved')} />
            </Box>
          </MenuItem>
        </Select>
      </FormControl>
    </Box>
  ), [t, incidentsState, setIncidentsState, setIncidentsPage]);

  return (
    <Box data-testid="incidents-tab">
      <DataTable
        columns={columns}
        data={flatData}
        sections={sections}
        rowKey="key"
        data-testid="incidents-table"
        page={incidentsPage}
        pageSize={incidentsPageSize}
        onPageChange={setIncidentsPage}
        onPageSizeChange={(newSize) => { setIncidentsPageSize(newSize); setIncidentsPage(0); }}
        totalCount={totalCount}
        toolbar={toolbar}
        onElementIdClick={onElementIdClick}
      />
    </Box>
  );
};
