import type { Meta, StoryObj } from '@storybook/react-vite';
import { Stack } from '@mui/material';
import { NumericBadge } from '@components/NumericBadge';

const meta: Meta<typeof NumericBadge> = {
  title: 'Components/NumericBadge',
  component: NumericBadge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof NumericBadge>;

export const Default: Story = {
  args: {
    value: 3,
    color: 'primary',
  },
};

export const Variants: Story = {
  render: () => (
    <Stack direction="row" spacing={1}>
      <NumericBadge value={0} color="error" />
      <NumericBadge value={12} color="primary" />
      <NumericBadge value={3} color="error" />
      <NumericBadge value={8} color="success" />
      <NumericBadge value={5} color="warning" />
      <NumericBadge value={2} color="info" />
    </Stack>
  ),
};
