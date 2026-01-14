import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import { Typography } from '@mui/material';
import { DataTable, type Column } from '@components/DataTable';
import type { FlowElementHistory } from '../types';

interface HistoryTabProps {
  history: FlowElementHistory[];
}

export const HistoryTab = ({ history }: HistoryTabProps) => {
  const { t } = useTranslation([ns.common, ns.processInstance]);

  // Table state
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const columns: Column<FlowElementHistory>[] = useMemo(
    () => [
      {
        id: 'key',
        label: t('processInstance:fields.key'),
        width: 180,
        render: (row) => (
          <Typography
            variant="body2"
            sx={{
              fontFamily: '"SF Mono", Monaco, monospace',
              fontSize: '0.75rem',
            }}
          >
            {row.key}
          </Typography>
        ),
      },
      {
        id: 'elementId',
        label: t('processInstance:fields.elementId'),
      },
      {
        id: 'state',
        label: t('processInstance:fields.state'),
        width: 100,
        render: (row) => row.state || '-',
      },
      {
        id: 'createdAt',
        label: t('processInstance:fields.createdAt'),
        width: 160,
        render: (row) => formatDate(row.createdAt),
      },
      {
        id: 'completedAt',
        label: t('processInstance:fields.completedAt'),
        width: 160,
        render: (row) => (row.completedAt ? formatDate(row.completedAt) : '-'),
      },
    ],
    [t]
  );

  return (
    <DataTable
      columns={columns}
      data={history}
      rowKey="key"
      page={page}
      pageSize={pageSize}
      onPageChange={setPage}
      onPageSizeChange={setPageSize}
      totalCount={history.length}
    />
  );
};

// Helper function for date formatting
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return dateString;
  }
}
