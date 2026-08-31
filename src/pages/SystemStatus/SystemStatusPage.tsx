import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import {
  Alert,
  alpha,
  Box,
  Chip,
  Divider,
  IconButton,
  Paper,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { themeColors } from '@base/theme';
import { frontendBuildMetadata, type BuildMetadata } from '@base/buildMetadata';

// ── Types (mirroring /internal/rest/cluster_status.go) ──────────────────────

const NODE_PARTITION_STATES = [
  'NodePartitionStateError',
  'NodePartitionStateJoining',
  'NodePartitionStateLeaving',
  'NodePartitionStateInitializing',
  'NodePartitionStateInitialized',
] as const;
const NODE_ROLES = ['RoleFollower', 'RoleLeader'] as const;
const NODE_STATES = ['NodeStateError', 'NodeStateStarted', 'NodeStateShutdown'] as const;
const NODE_SUFFRAGES = ['Voter', 'Nonvoter', 'Staging'] as const;

type NodePartitionState = (typeof NODE_PARTITION_STATES)[number];
type NodeRole = (typeof NODE_ROLES)[number];
type NodeState = (typeof NODE_STATES)[number];
type NodeSuffrage = (typeof NODE_SUFFRAGES)[number];

interface NodePartition {
  id: number;
  state?: NodePartitionState;
  role?: NodeRole;
}

interface ClusterNode {
  id: string;
  addr?: string;
  suffrage?: NodeSuffrage;
  state?: NodeState;
  role?: NodeRole;
  partitions: Record<string, NodePartition>;
}

interface PartialBuildMetadata {
  git?: Partial<BuildMetadata['git']>;
  build?: Partial<BuildMetadata['build']>;
}

interface ClusterPartition {
  id: number;
  leaderId?: string;
}

interface ClusterStatus extends PartialBuildMetadata {
  clusterConfig?: { desiredPartitions?: number };
  partitions?: Record<string, ClusterPartition>;
  nodes?: Record<string, ClusterNode>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value);

const isEnumValue = <T extends readonly string[]>(
  values: T,
  value: unknown,
): value is T[number] =>
  typeof value === 'string' && (values as readonly string[]).includes(value);

const optionalString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

const partitionId = (value: unknown, key: string): number | undefined => {
  if (isInteger(value)) {
    return value;
  }

  return /^\d+$/.test(key) ? Number(key) : undefined;
};

const parseNodePartitions = (value: unknown): Record<string, NodePartition> => {
  if (!isRecord(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).flatMap(([key, rawPartition]) => {
      if (!isRecord(rawPartition)) {
        return [];
      }

      const id = partitionId(rawPartition.id, key);
      if (id === undefined) {
        return [];
      }

      const partition: NodePartition = { id };
      if (isEnumValue(NODE_PARTITION_STATES, rawPartition.state)) {
        partition.state = rawPartition.state;
      }
      if (isEnumValue(NODE_ROLES, rawPartition.role)) {
        partition.role = rawPartition.role;
      }

      return [[String(id), partition]];
    }),
  );
};

const parseClusterPartitions = (value: unknown): Record<string, ClusterPartition> | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(value).flatMap(([key, rawPartition]) => {
      if (!isRecord(rawPartition)) {
        return [];
      }

      const id = partitionId(rawPartition.id, key);
      if (id === undefined) {
        return [];
      }

      const leaderId = optionalString(rawPartition.leaderId);
      return [[String(id), leaderId === undefined ? { id } : { id, leaderId }]];
    }),
  );
};

const parseClusterNodes = (value: unknown): Record<string, ClusterNode> | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(value).flatMap(([key, rawNode]) => {
      if (!isRecord(rawNode)) {
        return [];
      }

      const id = optionalString(rawNode.id) ?? optionalString(key);
      if (id === undefined) {
        return [];
      }

      const node: ClusterNode = {
        id,
        partitions: parseNodePartitions(rawNode.partitions),
      };
      const addr = optionalString(rawNode.addr);
      if (addr !== undefined) {
        node.addr = addr;
      }
      if (isEnumValue(NODE_SUFFRAGES, rawNode.suffrage)) {
        node.suffrage = rawNode.suffrage;
      }
      if (isEnumValue(NODE_STATES, rawNode.state)) {
        node.state = rawNode.state;
      }
      if (isEnumValue(NODE_ROLES, rawNode.role)) {
        node.role = rawNode.role;
      }

      return [[id, node]];
    }),
  );
};

const parseSystemStatus = (value: unknown): ClusterStatus => {
  if (!isRecord(value)) {
    throw new Error('Invalid system status response');
  }

  const status: ClusterStatus = {};

  if (isRecord(value.git)) {
    const branch = optionalString(value.git.branch);
    const commitId = optionalString(value.git.commitId);
    if (branch !== undefined || commitId !== undefined) {
      status.git = { branch, commitId };
    }
  }

  if (isRecord(value.build)) {
    const version = optionalString(value.build.version);
    const time = optionalString(value.build.time);
    if (version !== undefined || time !== undefined) {
      status.build = { version, time };
    }
  }

  if (isRecord(value.clusterConfig) && isInteger(value.clusterConfig.desiredPartitions)) {
    status.clusterConfig = { desiredPartitions: value.clusterConfig.desiredPartitions };
  }

  const partitions = parseClusterPartitions(value.partitions);
  if (partitions !== undefined) {
    status.partitions = partitions;
  }

  const nodes = parseClusterNodes(value.nodes);
  if (nodes !== undefined) {
    status.nodes = nodes;
  }

  return status;
};

// ── Enum maps ─────────────────────────────────────────────────────────────────

const NODE_STATE_COLOR: Record<NodeState, string> = {
  NodeStateError: themeColors.error,
  NodeStateStarted: themeColors.success,
  NodeStateShutdown: themeColors.textMuted,
};
const NODE_STATE_LABEL: Record<NodeState, string> = {
  NodeStateError: 'Error',
  NodeStateStarted: 'Started',
  NodeStateShutdown: 'Shutdown',
};
const PARTITION_STATE_LABEL: Record<NodePartitionState, string> = {
  NodePartitionStateError: 'Error',
  NodePartitionStateJoining: 'Joining',
  NodePartitionStateLeaving: 'Leaving',
  NodePartitionStateInitializing: 'Initializing',
  NodePartitionStateInitialized: 'Initialized',
};

// ── Data fetching ─────────────────────────────────────────────────────────────

const fetchSystemStatus = (): Promise<ClusterStatus> =>
  axios.get<unknown>('/system/status').then(({ data }) => parseSystemStatus(data));

// ── Small atoms ───────────────────────────────────────────────────────────────

/** Coloured 8-px dot that shows node health at a glance */
const StateDot = ({ state }: { state: NodeState }) => (
  <Box
    component="span"
    sx={{
      display: 'inline-block',
      width: 8,
      height: 8,
      borderRadius: '50%',
      flexShrink: 0,
      bgcolor: NODE_STATE_COLOR[state] ?? themeColors.textMuted,
    }}
  />
);

/** Cell content for the partition column of a given node */
const PartitionCell = ({
  np,
  leaderId,
  nodeId,
}: {
  np: NodePartition | undefined;
  leaderId?: string;
  nodeId: string;
}) => {
  if (!np) {
    return (
      <Typography sx={{ color: themeColors.textMuted, fontSize: '0.8rem', textAlign: 'center' }}>
        —
      </Typography>
    );
  }

  // Use the partition's authoritative leaderId to determine the true leader,
  // rather than relying solely on np.role. The backend may report RoleLeader
  // for multiple nodes, but only one matches leaderId.
  const isLeader =
    np.role === 'RoleLeader' && (leaderId === undefined || leaderId === nodeId);
  const isHealthy = np.state === 'NodePartitionStateInitialized';
  const roleLabel =
    np.role === undefined ? undefined : isLeader ? 'Leader' : 'Follower';
  const stateLabel =
    np.state !== undefined && (!isHealthy || roleLabel === undefined)
      ? PARTITION_STATE_LABEL[np.state]
      : undefined;

  if (roleLabel === undefined && stateLabel === undefined) {
    return (
      <Typography sx={{ color: themeColors.textMuted, fontSize: '0.8rem', textAlign: 'center' }}>
        —
      </Typography>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
      {roleLabel !== undefined && (
        <Chip
          label={roleLabel}
          size="small"
          variant={isLeader ? 'filled' : 'outlined'}
          sx={
            isLeader
              ? {
                bgcolor: themeColors.primaryBg,
                color: themeColors.primaryDark,
                fontWeight: 700,
                fontSize: '0.7rem',
                height: 20,
              }
              : {
                fontSize: '0.7rem',
                height: 20,
                color: themeColors.textSecondary,
                borderColor: themeColors.borderMedium,
              }
          }
        />
      )}
      {stateLabel !== undefined && (
        <Typography sx={{ fontSize: '0.65rem', color: 'warning.main', lineHeight: 1 }}>
          {stateLabel}
        </Typography>
      )}
    </Box>
  );
};

/** Summary stat: big number + small label */
const Stat = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <Box sx={{ minWidth: 60 }}>
    <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, color: themeColors.textPrimary, lineHeight: 1 }}>
      {value}
    </Typography>
    <Typography sx={{ fontSize: '0.7rem', color: themeColors.textMuted, textTransform: 'uppercase', letterSpacing: '0.4px', mt: 0.25 }}>
      {label}
    </Typography>
  </Box>
);

interface BuildInformationColumnProps {
  metadata?: PartialBuildMetadata;
  testId: string;
  title: string;
  loading?: boolean;
}

const BuildInformationColumn = ({ metadata, testId, title, loading = false }: BuildInformationColumnProps) => {
  const { t } = useTranslation([ns.common]);
  const allFields = [
    { label: t('common:systemStatus.version'), value: metadata?.build?.version },
    { label: t('common:systemStatus.buildTime'), value: metadata?.build?.time },
    { label: t('common:systemStatus.branch'), value: metadata?.git?.branch },
    { label: t('common:systemStatus.commitId'), value: metadata?.git?.commitId },
  ];
  const fields = loading
    ? allFields
    : allFields.filter(({ value }) => value !== undefined);

  if (fields.length === 0) {
    return null;
  }

  return (
    <Box data-testid={testId} sx={{ minWidth: 0, p: 3 }}>
      <Typography sx={{ color: themeColors.textPrimary, fontSize: '0.875rem', fontWeight: 700, mb: 2 }}>
        {title}
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(100px, auto) minmax(0, 1fr)', gap: '10px 24px' }}>
        {fields.map(({ label, value }) => (
          <Fragment key={label}>
            <Typography variant="captionNormal" sx={{ color: themeColors.textMuted }}>
              {label}
            </Typography>
            {loading ? (
              <Skeleton width={160} />
            ) : (
              <Typography
                sx={{
                  color: themeColors.textPrimary,
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                  overflowWrap: 'anywhere',
                }}
              >
                {value}
              </Typography>
            )}
          </Fragment>
        ))}
      </Box>
    </Box>
  );
};

const hasBuildMetadataFields = (metadata: PartialBuildMetadata | undefined): boolean =>
  metadata?.build?.version !== undefined ||
  metadata?.build?.time !== undefined ||
  metadata?.git?.branch !== undefined ||
  metadata?.git?.commitId !== undefined;

// ── Page ──────────────────────────────────────────────────────────────────────

export const SystemStatusPage = () => {
  const { t } = useTranslation([ns.common]);

  const { data, isLoading, isError, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['systemStatus'],
    queryFn: fetchSystemStatus,
    retry: false,
    refetchInterval: 10_000,
  });

  // Sorted lists for stable rendering
  const nodes = Object.values(data?.nodes ?? {}).sort((a, b) =>
    // leaders first, then alphabetically
    Number(b.role === 'RoleLeader') - Number(a.role === 'RoleLeader') ||
      a.id.localeCompare(b.id),
  );
  const partitionIds = [
    ...new Set([
      ...Object.values(data?.partitions ?? {}).map((partition) => partition.id),
      ...nodes.flatMap((node) =>
        Object.values(node.partitions).map((partition) => partition.id),
      ),
    ]),
  ].sort((a, b) => a - b);

  const activeNodes = nodes.filter((n) => n.state === 'NodeStateStarted').length;
  const allNodeStatesAvailable = nodes.length > 0 && nodes.every((node) => node.state !== undefined);
  const hasNodeAddresses = nodes.some((node) => node.addr !== undefined);
  const hasNodeStates = nodes.some((node) => node.state !== undefined);
  const hasNodeSuffrages = nodes.some((node) => node.suffrage !== undefined);
  const hasTopologyData = data?.nodes !== undefined || data?.partitions !== undefined;
  const hasBackendBuildMetadata = hasBuildMetadataFields(data);
  const summaryItems: { label: string; value: React.ReactNode }[] = [];

  if (data?.clusterConfig?.desiredPartitions !== undefined) {
    summaryItems.push({
      label: t('common:systemStatus.desiredPartitions'),
      value: data.clusterConfig.desiredPartitions,
    });
  }
  if (data?.partitions !== undefined) {
    summaryItems.push({
      label: t('common:systemStatus.activePartitions'),
      value: Object.keys(data.partitions).length,
    });
  }
  if (data?.nodes !== undefined) {
    summaryItems.push({
      label: t('common:systemStatus.nodes'),
      value: allNodeStatesAvailable ? (
        <Box component="span">
          {activeNodes}
          <Box component="span" sx={{ fontSize: '0.85rem', fontWeight: 400, color: themeColors.textMuted }}>
            /{nodes.length}
          </Box>
        </Box>
      ) : nodes.length,
    });
  }
  if (nodes.some((node) => node.role !== undefined)) {
    summaryItems.push({
      label: t('common:systemStatus.raftLeader'),
      value: nodes.filter((node) => node.role === 'RoleLeader').length,
    });
  }

  // Topology table column count: fixed cols + one per partition
  const colSpan =
    1 +
    Number(hasNodeAddresses) +
    Number(hasNodeStates) +
    Number(hasNodeSuffrages) +
    partitionIds.length;

  return (
    <Box data-testid="system-status-page">
      {/* ── Header ── */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography
            sx={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.5px', color: themeColors.textPrimary, mb: 0.5 }}
          >
            {t('common:systemStatus.title')}
          </Typography>
          <Typography sx={{ fontSize: '0.875rem', color: themeColors.textMuted }}>
            {t('common:systemStatus.description')}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5 }}>
          {dataUpdatedAt > 0 && (
            <Typography sx={{ fontSize: '0.75rem', color: themeColors.textMuted }}>
              {t('common:systemStatus.lastUpdated', { time: new Date(dataUpdatedAt).toLocaleTimeString() })}
            </Typography>
          )}
          <Tooltip title={t('common:actions.refresh')}>
            <IconButton onClick={() => void refetch()} size="small">
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {isError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error instanceof Error ? error.message : t('common:errors.loadFailed')}
        </Alert>
      )}

      {/* ── Summary bar ── */}
      {(isLoading || summaryItems.length > 0) && (
        <Paper
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            px: 3,
            py: 2,
            mb: 3,
            borderRadius: '12px',
            border: `1px solid ${themeColors.borderLight}`,
            flexWrap: 'wrap',
          }}
        >
          {isLoading
            ? [...Array(4) as number[]].map((_, i) => <Skeleton key={i} width={80} height={44} />)
            : summaryItems.map((item, index) => (
              <Fragment key={item.label}>
                {index > 0 && <Divider orientation="vertical" flexItem />}
                <Stat label={item.label} value={item.value} />
              </Fragment>
            ))}
        </Paper>
      )}

      {/* ── Cluster topology matrix ── */}
      {(isLoading || hasTopologyData) && <Paper
        data-testid="system-cluster-topology"
        sx={{
          mb: 3,
          borderRadius: '12px',
          border: `1px solid ${themeColors.borderLight}`,
          overflow: 'hidden',
        }}
      >
        {/* Section header */}
        <Box sx={{ px: 3, py: 1.75, borderBottom: `1px solid ${themeColors.borderLight}`, display: 'flex', alignItems: 'baseline', gap: 1 }}>
          <Typography sx={{ fontWeight: 600, fontSize: '0.95rem', color: themeColors.textPrimary }}>
            {t('common:systemStatus.topology')}
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', color: themeColors.textMuted }}>
            nodes × partitions
          </Typography>
        </Box>

        {isLoading ? (
          <Box sx={{ p: 3 }}>
            {[...Array(3) as number[]].map((_, i) => (
              <Skeleton key={i} height={40} sx={{ mb: 1 }} />
            ))}
          </Box>
        ) : (
          <TableContainer>
            <Table size="small" sx={{ tableLayout: 'auto' }}>
              <TableHead>
                <TableRow sx={{ bgcolor: themeColors.bgLighter }}>
                  {/* Fixed columns */}
                  {([
                    { key: 'nodeId', label: t('common:systemStatus.nodeId'), visible: true },
                    { key: 'address', label: t('common:systemStatus.address'), visible: hasNodeAddresses },
                    { key: 'nodeState', label: t('common:systemStatus.nodeState'), visible: hasNodeStates },
                    { key: 'suffrage', label: t('common:systemStatus.suffrage'), visible: hasNodeSuffrages },
                  ] as const).filter(({ visible }) => visible).map((h) => (
                    <TableCell
                      key={h.key}
                      sx={{
                        fontWeight: 600,
                        fontSize: '0.7rem',
                        color: themeColors.textMuted,
                        textTransform: 'uppercase',
                        letterSpacing: '0.4px',
                        whiteSpace: 'nowrap',
                        py: 1,
                      }}
                    >
                      {h.label}
                    </TableCell>
                  ))}
                  {/* Dynamic partition columns */}
                  {partitionIds.map((pid) => (
                    <TableCell
                      key={pid}
                      align="center"
                      sx={{
                        fontWeight: 700,
                        fontSize: '0.7rem',
                        color: themeColors.primaryDark,
                        textTransform: 'uppercase',
                        letterSpacing: '0.4px',
                        whiteSpace: 'nowrap',
                        py: 1,
                        bgcolor: themeColors.primaryBg,
                        borderLeft: `1px solid ${themeColors.borderLight}`,
                      }}
                    >
                      {t('common:systemStatus.partition')} {pid}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>

              <TableBody>
                {nodes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={colSpan} align="center" sx={{ color: themeColors.textMuted, py: 4 }}>
                      {t('common:table.noData')}
                    </TableCell>
                  </TableRow>
                ) : (
                  nodes.map((node) => (
                    <TableRow
                      key={node.id}
                      sx={{
                        '&:hover': { bgcolor: themeColors.bgLighter },
                        '&:last-child td': { borderBottom: 0 },
                      }}
                    >
                      {/* Node ID + state dot */}
                      <TableCell sx={{ py: 1.25, whiteSpace: 'nowrap' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {node.state !== undefined && (
                            <Tooltip title={NODE_STATE_LABEL[node.state]} placement="top">
                              <span>
                                <StateDot state={node.state} />
                              </span>
                            </Tooltip>
                          )}
                          <Typography
                            sx={{
                              fontFamily: 'monospace',
                              fontSize: '0.8125rem',
                              fontWeight: node.role === 'RoleLeader' ? 700 : 400,
                              color: themeColors.textPrimary,
                            }}
                          >
                            {node.id}
                          </Typography>
                        </Box>
                      </TableCell>

                      {/* Address */}
                      {hasNodeAddresses && (
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem', color: themeColors.textMuted, py: 1.25 }}>
                          {node.addr}
                        </TableCell>
                      )}

                      {/* State chip */}
                      {hasNodeStates && (
                        <TableCell sx={{ py: 1.25 }}>
                          {node.state !== undefined && (
                            <Chip
                              label={NODE_STATE_LABEL[node.state]}
                              size="small"
                              color={node.state === 'NodeStateStarted' ? 'success' : node.state === 'NodeStateError' ? 'error' : 'default'}
                              sx={{ fontSize: '0.7rem', height: 20 }}
                            />
                          )}
                        </TableCell>
                      )}

                      {/* Suffrage */}
                      {hasNodeSuffrages && (
                        <TableCell sx={{ fontSize: '0.8rem', color: themeColors.textMuted, py: 1.25 }}>
                          {node.suffrage}
                        </TableCell>
                      )}

                      {/* One cell per partition */}
                      {partitionIds.map((pid) => (
                        <TableCell
                          key={pid}
                          align="center"
                          sx={{
                            py: 1.25,
                            borderLeft: `1px solid ${themeColors.borderLight}`,
                            bgcolor:
                              node.partitions?.[String(pid)]?.role === 'RoleLeader' &&
                                data?.partitions?.[String(pid)]?.leaderId === node.id
                                ? alpha(themeColors.primaryBg, 0.4) // faint green tint for leader cells
                                : undefined,
                          }}
                        >
                          <PartitionCell
                            np={node.partitions?.[String(pid)]}
                            leaderId={data?.partitions?.[String(pid)]?.leaderId}
                            nodeId={node.id}
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>}

      {/* ── Build information ── */}
      <Paper
        data-testid="system-build-information"
        sx={{
          border: `1px solid ${themeColors.borderLight}`,
          borderRadius: '12px',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ px: 3, py: 1.75, borderBottom: `1px solid ${themeColors.borderLight}` }}>
          <Typography sx={{ color: themeColors.textPrimary, fontSize: '0.95rem', fontWeight: 600 }}>
            {t('common:systemStatus.buildInformation')}
          </Typography>
        </Box>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: isLoading || hasBackendBuildMetadata
                ? 'repeat(2, minmax(0, 1fr))'
                : '1fr',
            },
            '& > :not(:first-of-type)': {
              borderLeft: { md: `1px solid ${themeColors.borderLight}` },
              borderTop: { xs: `1px solid ${themeColors.borderLight}`, md: 0 },
            },
          }}
        >
          {(isLoading || hasBackendBuildMetadata) && (
            <BuildInformationColumn
              metadata={data}
              testId="backend-build-information"
              title={t('common:buildMetadata.zenbpm')}
              loading={isLoading}
            />
          )}
          <BuildInformationColumn
            metadata={frontendBuildMetadata}
            testId="frontend-build-information"
            title={t('common:buildMetadata.ui')}
          />
        </Box>
      </Paper>
    </Box>
  );
};
