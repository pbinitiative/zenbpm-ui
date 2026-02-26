import { Box } from '@mui/material';
import { ProcessInstancesTable } from '@components/ProcessInstancesTable';

interface ChildProcessesTabProps {
  processInstanceKey: string;
}

export const ChildProcessesTab = ({ processInstanceKey }: ChildProcessesTabProps) => {
  return (
    <Box>
      <ProcessInstancesTable
        parentProcessInstanceKey={processInstanceKey}
        syncWithUrl={false} // Disable URL sync as it's inside a tab
      />
    </Box>
  );
};
