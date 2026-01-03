export { PartitionedTable } from './PartitionedTable';
export type {
  PartitionedTableProps,
  PartitionData,
  PartitionedResponse,
  FilterValues,
} from './PartitionedTable';

// Legacy types for backward compatibility (deprecated)
export interface PartitionCount {
  partition: number;
  count: number;
}

export interface PartitionCounts {
  partitions: PartitionCount[];
  totalCount: number;
}
