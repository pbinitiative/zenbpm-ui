import type { Meta, StoryObj } from '@storybook/react-vite';
import { Paper } from '@mui/material';
import { MetadataPanel } from './components/MetadataPanel';

const meta: Meta<typeof MetadataPanel> = {
  title: 'Components/MetadataPanel',
  component: MetadataPanel,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <Paper sx={{ p: 2, width: 300 }}>
        <Story />
      </Paper>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MetadataPanel>;

export const ProcessDefinition: Story = {
  args: {
    entityKey: '3000000000000000046',
    name: 'Order Processing',
    version: 1,
    resourceName: 'order-process.bpmn',
    additionalFields: [{ label: 'Process ID', value: 'Order_Process' }],
  },
};

export const ProcessDefinitionWithVersions: Story = {
  args: {
    entityKey: '3000000000000000046',
    name: 'Order Processing',
    version: 2,
    versions: [
      { key: 3000000000000048, version: 3 },
      { key: 3000000000000047, version: 2 },
      { key: 3000000000000046, version: 1 },
    ],
    resourceName: 'order-process.bpmn',
    onVersionChange: (key) => console.log('Version changed to:', key),
  },
};

export const ProcessInstance: Story = {
  args: {
    entityKey: '3100000000000000017',
    state: 'active',
    createdAt: new Date().toISOString(),
    definitionInfo: {
      key: '3000000000000000046',
      type: 'process',
    },
  },
};

export const ProcessInstanceWithIncidents: Story = {
  args: {
    entityKey: '3100000000000000017',
    state: 'active',
    incidentsCount: 3,
    createdAt: new Date().toISOString(),
    definitionInfo: {
      key: '3000000000000000046',
      type: 'process',
    },
  },
};

export const CompletedInstance: Story = {
  args: {
    entityKey: '3100000000000000018',
    state: 'completed',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    definitionInfo: {
      key: '3000000000000000046',
      type: 'process',
    },
  },
};

export const FailedInstance: Story = {
  args: {
    entityKey: '3100000000000000019',
    state: 'failed',
    incidentsCount: 1,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    definitionInfo: {
      key: '3000000000000000046',
      type: 'process',
    },
  },
};

export const DecisionDefinition: Story = {
  args: {
    entityKey: '4000000000000000001',
    name: 'Customer Eligibility',
    version: 1,
    resourceName: 'eligibility.dmn',
    additionalFields: [{ label: 'Decision ID', value: 'customer_eligibility' }],
  },
};

export const CustomFields: Story = {
  args: {
    fields: [
      { label: 'ID', value: '12345', mono: true },
      { label: 'Name', value: 'Custom Entity' },
      { label: 'Type', value: 'Special' },
      { label: 'Created', value: '2024-01-15 10:30:00' },
    ],
  },
};

export const WithProcessInstanceLink: Story = {
  args: {
    entityKey: '5000000000000000001',
    state: 'active',
    createdAt: new Date().toISOString(),
    processInstanceKey: '3100000000000000017',
  },
};
