import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, Chip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import { PageHeader } from './PageHeader';

const meta: Meta<typeof PageHeader> = {
  title: 'Components/PageHeader',
  component: PageHeader,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: 'text',
      description: 'The main title of the page',
    },
    subtitle: {
      control: 'text',
      description: 'Optional subtitle displayed below the title',
    },
    actions: {
      control: false,
      description: 'Action buttons or controls to display on the right',
    },
    children: {
      control: false,
      description: 'Additional content to display next to the title',
    },
  },
};

export default meta;
type Story = StoryObj<typeof PageHeader>;

export const Default: Story = {
  args: {
    title: 'Process Definitions',
  },
};

export const WithSubtitle: Story = {
  args: {
    title: 'Process Definitions',
    subtitle: 'Manage and monitor your BPMN process definitions',
  },
};

export const WithActions: Story = {
  args: {
    title: 'Process Definitions',
    subtitle: 'Manage and monitor your BPMN process definitions',
    actions: (
      <>
        <Button variant="outlined" startIcon={<RefreshIcon />}>
          Refresh
        </Button>
        <Button variant="contained" startIcon={<AddIcon />}>
          Deploy New
        </Button>
      </>
    ),
  },
};

export const WithBadge: Story = {
  args: {
    title: 'Process Instances',
    subtitle: 'View all running and completed process instances',
    children: <Chip label="1,234 total" size="small" color="primary" />,
    actions: (
      <Button variant="outlined" startIcon={<RefreshIcon />}>
        Refresh
      </Button>
    ),
  },
};

export const LongTitle: Story = {
  args: {
    title: 'Business Process Management Dashboard Overview',
    subtitle:
      'This is a longer subtitle that provides more detailed information about the page content and functionality',
  },
};
