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

// ── Types (mirroring /internal/cluster/state/state.go) ───────────────────────

interface NodePartition {
  id: number;
  /** 1=Error 2=Joining 3=Leaving 4=Initializing 5=Initialized */
  state: number;
  /** 1=Follower 2=Leader */
  role: number;
}

interface ClusterNode {
  id: string;
  addr: string;
  /** raft.ServerSuffrage: 0=Voter 1=Nonvoter 2=Staging */
  suffrage: number;
  /** 1=Error 2=Started 3=Shutdown */
  state: number;
  /** 1=Follower 2=Leader */
  role: number;
  partitions: Record<string, NodePartition>;
}

interface ClusterStatus extends BuildMetadata {
  clusterConfig: { desiredPartitions: number };
  partitions: Record<string, { id: number; leaderId: string }>;
  nodes: Record<string, ClusterNode>;
}

// ── Enum maps ─────────────────────────────────────────────────────────────────

const NODE_STATE_COLOR: Record<number, string> = {
  1: themeColors.error,
  2: themeColors.success,
  3: themeColors.textMuted,
};
const NODE_STATE_LABEL: Record<number, string> = { 1: 'Error', 2: 'Started', 3: 'Shutdown' };
const PARTITION_STATE_LABEL: Record<number, string> = {
  1: 'Error', 2: 'Joining', 3: 'Leaving', 4: 'Initializing', 5: 'Initialized',
};
const SUFFRAGE_LABEL: Record<number, string> = { 0: 'Voter', 1: 'Nonvoter', 2: 'Staging' };

// ── Data fetching ─────────────────────────────────────────────────────────────

const fetchSystemStatus = (): Promise<ClusterStatus> =>
  axios.get<ClusterStatus>('/system/status').then((r) => r.data);

// ── Small atoms ───────────────────────────────────────────────────────────────

/** Coloured 8-px dot that shows node health at a glance */
const StateDot = ({ state }: { state: number }) => (
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
const PartitionCell = ({ np, leaderId, nodeId }: { np: NodePartition | undefined; leaderId: string; nodeId: string }) => {
  if (!np) {
    return (
      <Typography sx={{ color: themeColors.textMuted, fontSize: '0.8rem', textAlign: 'center' }}>
        —
      </Typography>
    );
  }

  // Use the partition's authoritative leaderId to determine the true leader,
  // rather than relying solely on np.role. The backend may report role === 2
  // for multiple nodes, but only one matches leaderId.
  const isLeader = np.role === 2 && leaderId === nodeId;
  const isHealthy = np.state === 5; // Initialized

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
      <Chip
        label={isLeader ? 'Leader' : 'Follower'}
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
      {!isHealthy && (
        <Typography sx={{ fontSize: '0.65rem', color: 'warning.main', lineHeight: 1 }}>
          {PARTITION_STATE_LABEL[np.state] ?? np.state}
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
  metadata?: BuildMetadata;
  testId: string;
  title: string;
  loading?: boolean;
}

const BuildInformationColumn = ({ metadata, testId, title, loading = false }: BuildInformationColumnProps) => {
  const { t } = useTranslation([ns.common]);
  const fields = [
    { label: t('common:systemStatus.version'), value: metadata?.build.version },
    { label: t('common:systemStatus.buildTime'), value: metadata?.build.time },
    { label: t('common:systemStatus.branch'), value: metadata?.git.branch },
    { label: t('common:systemStatus.commitId'), value: metadata?.git.commitId },
  ];

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
                {value || 'unknown'}
              </Typography>
            )}
          </Fragment>
        ))}
      </Box>
    </Box>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

export const SystemStatusPage = () => {
  const { t } = useTranslation([ns.common]);

  const { data, isLoading, isError, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['systemStatus'],
    queryFn: fetchSystemStatus,
    refetchInterval: 10_000,
  });

  // Sorted lists for stable rendering
  const nodes = Object.values(data?.nodes ?? {}).sort((a, b) =>
    // leaders first, then alphabetically
    b.role - a.role || a.id.localeCompare(b.id),
  );
  const partitionIds = Object.values(data?.partitions ?? {})
    .map((p) => p.id)
    .sort((a, b) => a - b);

  const activeNodes = nodes.filter((n) => n.state === 2).length;

  // Topology table column count: fixed cols + one per partition
  const colSpan = 4 + partitionIds.length;

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
        {isLoading ? (
          [...Array(4) as number[]].map((_, i) => <Skeleton key={i} width={80} height={44} />)
        ) : (
          <>
            <Stat label={t("common:systemStatus.desiredPartitions")} value={data?.clusterConfig.desiredPartitions ?? '—'} />
            <Divider orientation="vertical" flexItem />
            <Stat label={t("common:systemStatus.activePartitions")} value={partitionIds.length} />
            <Divider orientation="vertical" flexItem />
            <Stat
              label={t("common:systemStatus.nodes")}
              value={
                <Box component="span">
                  {activeNodes}
                  <Box component="span" sx={{ fontSize: '0.85rem', fontWeight: 400, color: themeColors.textMuted }}>
                    /{nodes.length}
                  </Box>
                </Box>
              }
            />
            <Divider orientation="vertical" flexItem />
            <Stat label={t("common:systemStatus.raftLeader")} value={nodes.filter((n) => n.role === 2).length} />
          </>
        )}
      </Paper>

      {/* ── Cluster topology matrix ── */}
      <Paper
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
                    { key: 'nodeId', label: t('common:systemStatus.nodeId') },
                    { key: 'address', label: t('common:systemStatus.address') },
                    { key: 'nodeState', label: t('common:systemStatus.nodeState') },
                    { key: 'suffrage', label: t('common:systemStatus.suffrage') },
                  ] as const).map((h) => (
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
                          <Tooltip title={NODE_STATE_LABEL[node.state] ?? node.state} placement="top">
                            <span>
                              <StateDot state={node.state} />
                            </span>
                          </Tooltip>
                          <Typography
                            sx={{
                              fontFamily: 'monospace',
                              fontSize: '0.8125rem',
                              fontWeight: node.role === 2 ? 700 : 400,
                              color: themeColors.textPrimary,
                            }}
                          >
                            {node.id}
                          </Typography>
                        </Box>
                      </TableCell>

                      {/* Address */}
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem', color: themeColors.textMuted, py: 1.25 }}>
                        {node.addr || '—'}
                      </TableCell>

                      {/* State chip */}
                      <TableCell sx={{ py: 1.25 }}>
                        <Chip
                          label={NODE_STATE_LABEL[node.state] ?? node.state}
                          size="small"
                          color={node.state === 2 ? 'success' : node.state === 1 ? 'error' : 'default'}
                          sx={{ fontSize: '0.7rem', height: 20 }}
                        />
                      </TableCell>

                      {/* Suffrage */}
                      <TableCell sx={{ fontSize: '0.8rem', color: themeColors.textMuted, py: 1.25 }}>
                        {SUFFRAGE_LABEL[node.suffrage] ?? node.suffrage}
                      </TableCell>

                      {/* One cell per partition */}
                      {partitionIds.map((pid) => (
                        <TableCell
                          key={pid}
                          align="center"
                          sx={{
                            py: 1.25,
                            borderLeft: `1px solid ${themeColors.borderLight}`,
                            bgcolor:
                              node.partitions?.[String(pid)]?.role === 2 &&
                                data?.partitions?.[String(pid)]?.leaderId === node.id
                                ? alpha(themeColors.primaryBg, 0.4) // faint green tint for leader cells
                                : undefined,
                          }}
                        >
                          <PartitionCell
                            np={node.partitions?.[String(pid)]}
                            leaderId={data?.partitions?.[String(pid)]?.leaderId ?? ''}
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
      </Paper>

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
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
            '& > :not(:first-of-type)': {
              borderLeft: { md: `1px solid ${themeColors.borderLight}` },
              borderTop: { xs: `1px solid ${themeColors.borderLight}`, md: 0 },
            },
          }}
        >
          <BuildInformationColumn
            metadata={data}
            testId="backend-build-information"
            title={t('common:buildMetadata.zenbpm')}
            loading={isLoading}
          />
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
