import { themeColors } from '@base/theme';

/**
 * Generate consistent colors for partitions
 */
export function getPartitionColor(partitionId: number): string {
  return themeColors.partitionColors[(partitionId - 1) % themeColors.partitionColors.length];
}
