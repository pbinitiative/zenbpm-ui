import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { DateRangePicker, type DateRangeValue } from './DateRangePicker';

const meta: Meta<typeof DateRangePicker> = {
  title: 'Components/DateRangePicker',
  component: DateRangePicker,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text',
      description: 'Label for the date range picker',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the picker is disabled',
    },
  },
};

export default meta;
type Story = StoryObj<typeof DateRangePicker>;

// Interactive wrapper
const InteractiveDateRangePicker = ({
  label,
  disabled,
  initialValue,
}: {
  label?: string;
  disabled?: boolean;
  initialValue?: DateRangeValue;
}) => {
  const [value, setValue] = useState<DateRangeValue>(initialValue ?? {});

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-start' }}>
      <DateRangePicker value={value} onChange={setValue} label={label} disabled={disabled} />
      <Typography variant="caption" color="text.secondary">
        Current value: {JSON.stringify(value)}
      </Typography>
    </Box>
  );
};

export const Default: Story = {
  render: () => <InteractiveDateRangePicker />,
};

export const WithLabel: Story = {
  render: () => <InteractiveDateRangePicker label="Created Date" />,
};

export const WithInitialValue: Story = {
  render: () => (
    <InteractiveDateRangePicker
      label="Date Range"
      initialValue={{
        from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        to: new Date().toISOString(),
      }}
    />
  ),
};

export const Disabled: Story = {
  render: () => <InteractiveDateRangePicker label="Date Range" disabled />,
};

export const WithRelativeValue: Story = {
  render: () => (
    <InteractiveDateRangePicker
      label="Last 24 hours"
      initialValue={{
        from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        to: new Date().toISOString(),
      }}
    />
  ),
};
