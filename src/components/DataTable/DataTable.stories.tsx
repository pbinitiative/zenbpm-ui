import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Chip, Button, TextField, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { DataTable, type Column, type SortOrder } from './DataTable';

interface SampleRow {
  id: number;
  name: string;
  status: 'active' | 'completed' | 'failed';
  createdAt: string;
  count: number;
}

const sampleData: SampleRow[] = Array.from({ length: 50 }, (_, i) => ({
  id: i + 1,
  name: `Process ${i + 1}`,
  status: ['active', 'completed', 'failed'][i % 3] as SampleRow['status'],
  createdAt: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
  count: Math.floor(Math.random() * 100),
}));

const columns: Column<SampleRow>[] = [
  { id: 'id', label: 'ID', width: 80, sortable: true },
  { id: 'name', label: 'Name', sortable: true },
  {
    id: 'status',
    label: 'Status',
    width: 120,
    render: (row) => (
      <Chip
        label={row.status}
        size="small"
        color={row.status === 'active' ? 'primary' : row.status === 'completed' ? 'success' : 'error'}
      />
    ),
  },
  { id: 'createdAt', label: 'Created', width: 120, sortable: true },
  { id: 'count', label: 'Count', width: 80, align: 'right', sortable: true },
];

const meta: Meta<typeof DataTable<SampleRow>> = {
  title: 'Components/DataTable',
  component: DataTable,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof DataTable<SampleRow>>;

export const Default: Story = {
  args: {
    columns,
    data: sampleData.slice(0, 10),
    rowKey: 'id',
    totalCount: 10,
  },
};

// Wrapper components for interactive stories
const WithPaginationWrapper = () => {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  return (
    <DataTable
      columns={columns}
      data={sampleData}
      rowKey="id"
      page={page}
      pageSize={pageSize}
      onPageChange={setPage}
      onPageSizeChange={setPageSize}
    />
  );
};

export const WithPagination: Story = {
  render: () => <WithPaginationWrapper />,
};

const WithSortingWrapper = () => {
  const [sortBy, setSortBy] = useState<string>('id');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const sortedData = [...sampleData].sort((a, b) => {
    const aVal = a[sortBy as keyof SampleRow];
    const bVal = b[sortBy as keyof SampleRow];
    const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return sortOrder === 'asc' ? cmp : -cmp;
  });

  return (
    <DataTable
      columns={columns}
      data={sortedData}
      rowKey="id"
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSortChange={(newSortBy, newSortOrder) => {
        setSortBy(newSortBy);
        setSortOrder(newSortOrder);
      }}
      page={page}
      pageSize={pageSize}
      onPageChange={setPage}
      onPageSizeChange={setPageSize}
    />
  );
};

export const WithSorting: Story = {
  render: () => <WithSortingWrapper />,
};

const WithToolbarWrapper = () => {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  return (
    <DataTable
      columns={columns}
      data={sampleData}
      rowKey="id"
      page={page}
      pageSize={pageSize}
      onPageChange={setPage}
      onPageSizeChange={setPageSize}
      toolbar={
        <>
          <TextField
            size="small"
            placeholder="Search..."
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ mr: 2 }}
          />
          <Button variant="outlined" size="small">
            Filter
          </Button>
        </>
      }
    />
  );
};

export const WithToolbar: Story = {
  render: () => <WithToolbarWrapper />,
};

export const Loading: Story = {
  args: {
    columns,
    data: [],
    rowKey: 'id',
    loading: true,
  },
};

export const LoadingWithData: Story = {
  args: {
    columns,
    data: sampleData.slice(0, 5),
    rowKey: 'id',
    loading: true,
    totalCount: 5,
  },
};

export const Empty: Story = {
  args: {
    columns,
    data: [],
    rowKey: 'id',
  },
};

const ClickableRowsWrapper = () => {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  return (
    <DataTable
      columns={columns}
      data={sampleData}
      rowKey="id"
      page={page}
      pageSize={pageSize}
      onPageChange={setPage}
      onPageSizeChange={setPageSize}
      onRowClick={(row) => alert(`Clicked row: ${row.name}`)}
    />
  );
};

export const ClickableRows: Story = {
  render: () => <ClickableRowsWrapper />,
};
