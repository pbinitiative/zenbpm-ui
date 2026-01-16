import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Box } from '@mui/material';
import { TablePagination } from './TablePagination';

const meta: Meta<typeof TablePagination> = {
  title: 'Components/TablePagination',
  component: TablePagination,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    count: {
      control: { type: 'number', min: 0 },
      description: 'Total number of items',
    },
    page: {
      control: { type: 'number', min: 0 },
      description: 'Current page (0-indexed)',
    },
    pageSize: {
      control: { type: 'number' },
      description: 'Number of rows per page',
    },
    pageSizeOptions: {
      control: 'object',
      description: 'Available page size options',
    },
  },
  decorators: [
    (Story) => (
      <Box sx={{ width: '100%', maxWidth: 800 }}>
        <Story />
      </Box>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TablePagination>;

// Interactive wrapper for controlled pagination
const InteractivePagination = ({
  initialCount = 100,
  initialPageSize = 10,
  pageSizeOptions = [5, 10, 20, 50],
}: {
  initialCount?: number;
  initialPageSize?: number;
  pageSizeOptions?: number[];
}) => {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);

  return (
    <TablePagination
      count={initialCount}
      page={page}
      pageSize={pageSize}
      onPageChange={setPage}
      onPageSizeChange={setPageSize}
      pageSizeOptions={pageSizeOptions}
    />
  );
};

export const Default: Story = {
  args: {
    count: 100,
    page: 0,
    pageSize: 10,
    onPageChange: () => {},
    onPageSizeChange: () => {},
  },
};

export const Interactive: Story = {
  render: () => <InteractivePagination />,
};

export const FewItems: Story = {
  args: {
    count: 15,
    page: 0,
    pageSize: 10,
    onPageChange: () => {},
    onPageSizeChange: () => {},
  },
};

export const ManyPages: Story = {
  args: {
    count: 1000,
    page: 5,
    pageSize: 10,
    onPageChange: () => {},
    onPageSizeChange: () => {},
  },
};

export const CustomPageSizes: Story = {
  render: () => (
    <InteractivePagination
      initialCount={500}
      initialPageSize={25}
      pageSizeOptions={[25, 50, 100, 200]}
    />
  ),
};

export const SinglePage: Story = {
  args: {
    count: 5,
    page: 0,
    pageSize: 10,
    onPageChange: () => {},
    onPageSizeChange: () => {},
  },
};
