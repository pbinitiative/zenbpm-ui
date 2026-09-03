import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { MemoryRouter } from 'react-router-dom';
import { theme } from '@base/theme';
import '@base/i18n';
import { SystemStatusPage } from './SystemStatusPage';

// ── Meta ──────────────────────────────────────────────────────────────────────

const meta: Meta<typeof SystemStatusPage> = {
  title: 'Pages/SystemStatus',
  component: SystemStatusPage,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof SystemStatusPage>;

// ── 3 nodes, 3 partitions ────────────────────────────────────────────────────

/** Mock data: 3 nodes, each leading a distinct partition, all partition state Initialized. */
const mockData = {
  git: {
    branch: 'main',
    commitId: 'ac80841035e9',
  },
  build: {
    version: 'v1.5.0',
    time: '2026-08-10T07:33:20Z',
  },
  clusterConfig: { desiredPartitions: 3 },
  partitions: {
    '1': { id: 1, leaderId: 'node-1' },
    '2': { id: 2, leaderId: 'node-2' },
    '3': { id: 3, leaderId: 'node-3' },
  },
  nodes: {
    'node-1': {
      id: 'node-1',
      addr: 'localhost:8091',
      suffrage: 'Voter',
      state: 'NodeStateStarted',
      role: 'RoleLeader', // Cluster leader
      partitions: {
        '1': { id: 1, state: 'NodePartitionStateInitialized', role: 'RoleLeader' },
        '2': { id: 2, state: 'NodePartitionStateInitialized', role: 'RoleFollower' },
        '3': { id: 3, state: 'NodePartitionStateInitialized', role: 'RoleFollower' },
      },
    },
    'node-2': {
      id: 'node-2',
      addr: 'localhost:8092',
      suffrage: 'Voter',
      state: 'NodeStateStarted',
      role: 'RoleFollower',
      partitions: {
        '1': { id: 1, state: 'NodePartitionStateInitialized', role: 'RoleFollower' },
        '2': { id: 2, state: 'NodePartitionStateInitialized', role: 'RoleLeader' },
        '3': { id: 3, state: 'NodePartitionStateInitialized', role: 'RoleFollower' },
      },
    },
    'node-3': {
      id: 'node-3',
      addr: 'localhost:8093',
      suffrage: 'Voter',
      state: 'NodeStateStarted',
      role: 'RoleFollower',
      partitions: {
        '1': { id: 1, state: 'NodePartitionStateInitialized', role: 'RoleFollower' },
        '2': { id: 2, state: 'NodePartitionStateInitialized', role: 'RoleFollower' },
        '3': { id: 3, state: 'NodePartitionStateInitialized', role: 'RoleLeader' },
      },
    },
  },
};

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});
queryClient.setQueryData(['systemStatus'], mockData);

/**
 * Verifies the topology table correctly assigns leader/follower per partition:
 * - Partition 1 → node-1 is Leader
 * - Partition 2 → node-2 is Leader
 * - Partition 3 → node-3 is Leader
 */
export const ThreeNodesThreePartitions: Story = {
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <MemoryRouter>
            <Story />
          </MemoryRouter>
        </ThemeProvider>
      </QueryClientProvider>
    ),
  ],
};
