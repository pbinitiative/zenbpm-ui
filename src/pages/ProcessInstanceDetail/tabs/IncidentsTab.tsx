import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import { Box, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { DataTable, type Column, type SortOrder, type DataTableSection } from '@components/DataTable';
import { StateBadge } from '@components/StateBadge';
import { useIncidentDetailModal } from '@components/IncidentsTable/components/useIncidentDetailModal';
import { useStackTraceModal } from '@components/IncidentsTable/components/useStackTraceModal';
import { getIncidentColumns } from '@components/IncidentsTable/table/columns';
import type { Incident } from '@components/IncidentsTable';
import { resolveIncident } from '@base/openapi';
import type { ProcessInstance } from '../types';

// processType display order — determines section ordering after the main instance
const PROCESS_TYPE_ORDER: Record<string, number> = {
  default: 0,
  callActivity: 1,
  subprocess: 2,
  multiInstance: 3,
};

type StateFilter = 'all' | 'unresolved' | 'resolved';

interface IncidentsTabProps {
  incidents: Incident[];
  childProcessIncidents?: Record<string, Incident[]>;
  childProcesses?: ProcessInstance[];
  grandchildProcesses?: Record<string, ProcessInstance[]>;
  onRefetch?: () => Promise<void>;
  onShowNotification?: (message: string, severity: 'success' | 'error') => void;
  /** Called when an element ID cell is clicked — used to highlight the element in the diagram. */
  onElementIdClick?: (elementId: string) => void;
}

export const IncidentsTab = ({
  incidents,
  childProcessIncidents = {},
  childProcesses = [],
  grandchildProcesses = {},
  onRefetch,
  onShowNotification,
  onElementIdClick,
}: IncidentsTabProps) => {
  const { t } = useTranslation([ns.common, ns.incidents, ns.processes, ns.processInstance]);

  const { openIncidentDetail } = useIncidentDetailModal();
  const { openStackTrace } = useStackTraceModal();

  // Table state
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [stateFilter, setStateFilter] = useState<StateFilter>('all');

  // Build a flat lookup: instanceKey → ProcessInstance (children + subprocess-grandchildren)
  const instanceByKey = useMemo<Record<string, ProcessInstance>>(() => {
    const map: Record<string, ProcessInstance> = {};
    for (const cp of childProcesses) {
      map[cp.key] = cp;
    }
    for (const grandchildren of Object.values(grandchildProcesses)) {
      for (const gc of grandchildren) {
        map[gc.key] = gc;
      }
    }
    return map;
  }, [childProcesses, grandchildProcesses]);

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

  // Apply state filter to an incident list
  const applyFilter = useCallback(
    (list: Incident[]): Incident[] => {
      if (stateFilter === 'unresolved') return list.filter((i) => !i.resolvedAt);
      if (stateFilter === 'resolved') return list.filter((i) => !!i.resolvedAt);
      return list;
    },
    [stateFilter]
  );

  // Build sections: first section is the main instance (no header), then one
  // section per child/grandchild process key that has incidents (after filter).
  const sections = useMemo<DataTableSection<Incident>[] | undefined>(() => {
    const childEntries = Object.entries(childProcessIncidents).filter(
      ([, incidentList]) => incidentList.length > 0
    );

    if (childEntries.length === 0) return undefined;

    childEntries.sort(([keyA], [keyB]) => {
      const typeA = instanceByKey[keyA]?.processType ?? '';
      const typeB = instanceByKey[keyB]?.processType ?? '';
      const orderA = PROCESS_TYPE_ORDER[typeA] ?? 99;
      const orderB = PROCESS_TYPE_ORDER[typeB] ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      return keyA.localeCompare(keyB);
    });

    const result: DataTableSection<Incident>[] = [];

    const rootFiltered = applyFilter(incidents);
    if (rootFiltered.length > 0) {
      result.push({ label: '', data: rootFiltered });
    }

    for (const [instanceKey, incidentList] of childEntries) {
      const filtered = applyFilter(incidentList);
      if (filtered.length === 0) continue;
      const instance = instanceByKey[instanceKey];
      const typeLabel = instance?.processType
        ? t(`processes:types.${instance.processType}`)
        : t('processInstance:fields.childProcess');
      result.push({ label: `${typeLabel}: ${instanceKey}`, data: filtered });
    }

    return result.length > 0 ? result : undefined;
  }, [incidents, childProcessIncidents, instanceByKey, applyFilter, t]);

  const filteredRootIncidents = useMemo(
    () => (sections ? [] : applyFilter(incidents)),
    [sections, applyFilter, incidents]
  );

  const totalCount = useMemo(() => {
    if (sections) return sections.reduce((acc, s) => acc + s.data.length, 0);
    return filteredRootIncidents.length;
  }, [sections, filteredRootIncidents]);

  // State filter toolbar (matching the visual style of other filter toolbars)
  const toolbar = useMemo(() => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
      <FormControl size="small" sx={{ minWidth: 200 }}>
        <InputLabel>{t('incidents:fields.state')}</InputLabel>
        <Select
          value={stateFilter}
          label={t('incidents:fields.state')}
          onChange={(e) => {
            setStateFilter(e.target.value as StateFilter);
            setPage(0);
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
  ), [t, stateFilter]);

  return (
    <Box data-testid="incidents-tab">
      <DataTable
        columns={columns}
        data={filteredRootIncidents}
        sections={sections}
        rowKey="key"
        data-testid="incidents-table"
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={(newSortBy, newSortOrder) => {
          setSortBy(newSortBy);
          setSortOrder(newSortOrder);
        }}
        totalCount={totalCount}
        toolbar={toolbar}
      />
    </Box>
  );
};
