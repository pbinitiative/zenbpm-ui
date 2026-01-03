// MSW handlers for cluster endpoints
import { http, HttpResponse } from 'msw';
import { withValidation } from '../validation';

const BASE_URL = '/v1';

// Mock cluster/partition data
interface MockPartition {
  id: number;
  nodeId: string;
  status: 'active' | 'inactive' | 'recovering';
  leader: boolean;
  term: number;
  lastHeartbeat: string;
}

interface MockNode {
  id: string;
  address: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  partitions: number[];
}

const minutesAgo = (minutes: number): string => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - minutes);
  return date.toISOString();
};

// Mock data
const partitions: MockPartition[] = [
  {
    id: 1,
    nodeId: 'node-1',
    status: 'active',
    leader: true,
    term: 42,
    lastHeartbeat: minutesAgo(0),
  },
  {
    id: 2,
    nodeId: 'node-2',
    status: 'active',
    leader: true,
    term: 38,
    lastHeartbeat: minutesAgo(0),
  },
  {
    id: 3,
    nodeId: 'node-3',
    status: 'active',
    leader: true,
    term: 45,
    lastHeartbeat: minutesAgo(1),
  },
  {
    id: 4,
    nodeId: 'node-1',
    status: 'recovering',
    leader: false,
    term: 12,
    lastHeartbeat: minutesAgo(5),
  },
];

const nodes: MockNode[] = [
  {
    id: 'node-1',
    address: 'localhost:8090',
    status: 'healthy',
    partitions: [1, 4],
  },
  {
    id: 'node-2',
    address: 'localhost:8091',
    status: 'healthy',
    partitions: [2],
  },
  {
    id: 'node-3',
    address: 'localhost:8092',
    status: 'healthy',
    partitions: [3],
  },
];

export const clusterHandlers = [
  // GET /cluster/partitions - Get list of partitions
  http.get(
    `${BASE_URL}/cluster/partitions`,
    withValidation(() => {
      return HttpResponse.json({
        partitions: partitions.map((p) => ({
          id: p.id,
          nodeId: p.nodeId,
          status: p.status,
          leader: p.leader,
          term: p.term,
          lastHeartbeat: p.lastHeartbeat,
        })),
      });
    })
  ),

  // GET /cluster/nodes - Get list of nodes
  http.get(
    `${BASE_URL}/cluster/nodes`,
    withValidation(() => {
      return HttpResponse.json({
        nodes: nodes.map((n) => ({
          id: n.id,
          address: n.address,
          status: n.status,
          partitions: n.partitions,
        })),
      });
    })
  ),

  // GET /cluster/status - Get overall cluster status
  http.get(
    `${BASE_URL}/cluster/status`,
    withValidation(() => {
      const activePartitions = partitions.filter((p) => p.status === 'active').length;
      const healthyNodes = nodes.filter((n) => n.status === 'healthy').length;

      return HttpResponse.json({
        status: activePartitions === partitions.length ? 'healthy' : 'degraded',
        partitions: {
          total: partitions.length,
          active: activePartitions,
          recovering: partitions.filter((p) => p.status === 'recovering').length,
          inactive: partitions.filter((p) => p.status === 'inactive').length,
        },
        nodes: {
          total: nodes.length,
          healthy: healthyNodes,
          unhealthy: nodes.filter((n) => n.status === 'unhealthy').length,
          unknown: nodes.filter((n) => n.status === 'unknown').length,
        },
      });
    })
  ),
];
