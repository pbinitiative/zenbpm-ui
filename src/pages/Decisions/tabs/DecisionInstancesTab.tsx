import { Box } from '@mui/material';
import { DecisionInstancesTable } from '@components/DecisionInstancesTable';

interface DecisionInstancesTabProps {
  refreshKey?: number;
}

export const DecisionInstancesTab = ({ refreshKey = 0 }: DecisionInstancesTabProps) => {
  return (
    <Box>
      <DecisionInstancesTable refreshKey={refreshKey} />
    </Box>
  );
};
