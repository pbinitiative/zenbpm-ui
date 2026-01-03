import { Box } from '@mui/material';
import { ProcessInstancesTable } from '@components/ProcessInstancesTable';

interface ProcessInstancesTabProps {
  refreshKey?: number;
}

export const ProcessInstancesTab = ({ refreshKey = 0 }: ProcessInstancesTabProps) => {
  return (
    <Box>
      <ProcessInstancesTable refreshKey={refreshKey} syncWithUrl />
    </Box>
  );
};
