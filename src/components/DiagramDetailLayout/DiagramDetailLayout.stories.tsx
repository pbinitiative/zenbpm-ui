import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box, Typography, Fab, List, ListItem, ListItemText, Chip } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import EditIcon from '@mui/icons-material/Edit';
import { DiagramDetailLayout } from './DiagramDetailLayout';

const meta: Meta<typeof DiagramDetailLayout> = {
  title: 'Components/DiagramDetailLayout',
  component: DiagramDetailLayout,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <Box sx={{ p: 3, minHeight: '100vh', bgcolor: 'grey.100' }}>
        <Story />
      </Box>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof DiagramDetailLayout>;

// Sample metadata content
const MetadataContent = () => (
  <List dense disablePadding>
    <ListItem disableGutters>
      <ListItemText primary="Key" secondary="3000000000000000046" />
    </ListItem>
    <ListItem disableGutters>
      <ListItemText primary="Version" secondary="1" />
    </ListItem>
    <ListItem disableGutters>
      <ListItemText primary="Process ID" secondary="Order_Process" />
    </ListItem>
    <ListItem disableGutters>
      <ListItemText
        primary="Status"
        secondary={<Chip label="Active" size="small" color="success" />}
      />
    </ListItem>
  </List>
);

// Sample diagram placeholder
const DiagramPlaceholder = () => (
  <Box
    sx={{
      height: 300,
      bgcolor: 'grey.200',
      borderRadius: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <Typography color="text.secondary">BPMN Diagram Placeholder</Typography>
  </Box>
);

// Sample table placeholder
const TablePlaceholder = () => (
  <Box
    sx={{
      height: 200,
      bgcolor: 'grey.200',
      borderRadius: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <Typography color="text.secondary">Process Instances Table</Typography>
  </Box>
);

export const Default: Story = {
  args: {
    leftSection: <MetadataContent />,
    leftTitle: 'Metadata',
    rightSection: <DiagramPlaceholder />,
    rightTitle: 'Diagram',
  },
};

export const WithBottomSection: Story = {
  args: {
    leftSection: <MetadataContent />,
    leftTitle: 'Metadata',
    rightSection: <DiagramPlaceholder />,
    rightTitle: 'Diagram',
    bottomSection: <TablePlaceholder />,
    bottomTitle: 'Process Instances',
  },
};

export const WithFloatingActions: Story = {
  args: {
    leftSection: <MetadataContent />,
    leftTitle: 'Metadata',
    rightSection: <DiagramPlaceholder />,
    rightTitle: 'Diagram',
    bottomSection: <TablePlaceholder />,
    bottomTitle: 'Process Instances',
    floatingActions: (
      <>
        <Fab color="primary" size="medium">
          <PlayArrowIcon />
        </Fab>
        <Fab color="primary" size="medium">
          <EditIcon />
        </Fab>
      </>
    ),
  },
};

export const WithoutBottomTitle: Story = {
  args: {
    leftSection: <MetadataContent />,
    leftTitle: 'Metadata',
    rightSection: <DiagramPlaceholder />,
    rightTitle: 'Diagram',
    bottomSection: <TablePlaceholder />,
  },
};
