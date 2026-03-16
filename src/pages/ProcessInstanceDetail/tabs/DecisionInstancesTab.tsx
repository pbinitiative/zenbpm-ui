import { DecisionInstancesTable } from '@components/DecisionInstancesTable';

interface DecisionInstancesTabProps {
  processInstanceKey: string;
}

export const DecisionInstancesTab = ({ processInstanceKey }: DecisionInstancesTabProps) => {
  return (
    <DecisionInstancesTable
      processInstanceKey={processInstanceKey}
      syncWithUrl={false}
      data-testid="process-instance-decision-instances-table"
    />
  );
};
