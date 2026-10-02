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
import type { NotificationOptions } from '../types';
import type { ProcessInstanceNode } from '../types/tree';
import {
  apiErrorMessage,
  collectNodes,
  compareByProcessType,
  isIncidentOpen,
  isResolutionRefused,
} from '../utils';

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
  onShowNotification?: (message: string, severity: 'success' | 'error', options?: NotificationOptions) => void;
  /** Called when an element ID cell is clicked — used to highlight the element in the diagram. */
  onElementIdClick?: (elementId: string) => void;
  /** Opens the Jobs tab focused on the element instance whose job raised an incident. */
  onNavigateToJob?: (elementInstanceKey: string) => void;
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
  onNavigateToJob,
}: IncidentsTabProps) => {
  const { t } = useTranslation([ns.common, ns.incidents, ns.processes, ns.processInstance]);

  const { openIncidentDetail } = useIncidentDetailModal();
  const { openStackTrace } = useStackTraceModal();

  // The process instance of every incident shown: incidents are read by instance.
  const processInstanceKeyOfIncident = useMemo(() => {
    const keys = new Map<string, string>();
    if (!instanceTree) return keys;
    for (const node of collectNodes(instanceTree)) {
      for (const incident of node.incidents) keys.set(incident.key, incident.processInstanceKey);
    }
    return keys;
  }, [instanceTree]);

  // The reason of an error stays until it is closed: it is long, and names
  // what the operator has to change before resolving again.
  const handleResolveIncident = useCallback(async (incidentKey: string) => {
    try {
      await resolveIncident(incidentKey);
      onShowNotification?.(t('incidents:messages.resolved'), 'success');
    } catch (err) {
      const reason = apiErrorMessage(err) ?? t('incidents:messages.resolveFailed');
      if (isResolutionRefused(err)) {
        // a refusal changed nothing, and the operator has to act on its reason
        onShowNotification?.(t('incidents:messages.resolveRefused', { reason }), 'error', { persist: true });
        return;
      }
      // Any other error may follow a resolution which succeeded and then
      // raised a new incident, which the refetch shows. An incident still
      // open was not resolved at all. When the check fails too, as in an
      // outage, nothing tells the two apart, so the operator hears that.
      const state = await incidentStateAfterFailedResolution(processInstanceKeyOfIncident.get(incidentKey), incidentKey);
      if (state === 'open') {
        onShowNotification?.(t('incidents:messages.resolveFailedWithReason', { reason }), 'error', { persist: true });
      } else if (state === 'unknown') {
        onShowNotification?.(t('incidents:messages.resolveOutcomeUnknown', { reason }), 'error', { persist: true });
      }
    } finally {
      await onRefetch?.();
    }
  }, [t, onShowNotification, onRefetch, processInstanceKeyOfIncident]);

  // The job of an incident shares its element instance: the engine raises a
  // job's incident on the job's own token. Only incidents carrying a `jobKey`
  // were raised by a job, so only they link to one.
  const handleViewJob = useMemo(
    () => onNavigateToJob
      ? (incident: Incident) => {
          if (incident.jobKey) onNavigateToJob(incident.elementInstanceKey);
        }
      : undefined,
    [onNavigateToJob]
  );

  const handleViewDetails = useCallback((incident: Incident) => {
    openIncidentDetail({
      incident,
      onResolve: incident.resolvedAt ? undefined : (incidentKey) => {
        void handleResolveIncident(incidentKey);
      },
      onViewJob: handleViewJob,
    });
  }, [openIncidentDetail, handleResolveIncident, handleViewJob]);

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
        onViewJob: handleViewJob,
      }),
    [t, handleViewDetails, handleResolveIncident, handleMessageClick, onElementIdClick, handleViewJob]
  );

  // Build sections from the server-fetched data — no client-side slicing or filtering.
  // Pagination and state filtering are handled server-side; page/state changes trigger API refetch for all nodes.
  const { sections, flatData, totalCount } = useMemo(() => {
    if (!instanceTree) return { sections: undefined, flatData: [], totalCount: 0 };

    const nodes = collectNodes(instanceTree);
    const rootNode = nodes[0];
    const childNodes = nodes.slice(1).sort(compareByProcessType);
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

/**
 * Whether the incident is still unresolved after its resolution failed:
 * `unknown` when the incident's instance is not known or the check fails.
 */
async function incidentStateAfterFailedResolution(
  processInstanceKey: string | undefined,
  incidentKey: string
): Promise<'open' | 'resolved' | 'unknown'> {
  if (processInstanceKey === undefined) return 'unknown';
  try {
    return (await isIncidentOpen(processInstanceKey, incidentKey)) ? 'open' : 'resolved';
  } catch {
    return 'unknown';
  }
}
