import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Box } from '@mui/material';
import { VersionSelector, type VersionOption } from './VersionSelector';
import { getLatestVersionKey } from './utils';

const meta: Meta<typeof VersionSelector> = {
  title: 'Components/VersionSelector',
  component: VersionSelector,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof VersionSelector>;

const taggedVersions: VersionOption[] = [
  { key: '3000000000000000035', version: 3, versionTag: 'v3.0.0-rc1' },
  { key: '3000000000000000034', version: 2, versionTag: 'v2.1.0' },
  { key: '3000000000000000033', version: 1, versionTag: 'release-1' },
];

// Interactive wrapper
const InteractiveVersionSelector = ({
  options,
  initialKey,
  showViewingChip,
  width,
}: {
  options: VersionOption[];
  initialKey: string;
  showViewingChip?: boolean;
  width?: number;
}) => {
  const [value, setValue] = useState(initialKey);
  return (
    <Box sx={{ width }}>
      <VersionSelector
        value={value}
        onChange={setValue}
        options={options}
        latestKey={getLatestVersionKey(options)}
        showViewingChip={showViewingChip}
      />
    </Box>
  );
};

/** On a definition page, viewing an older version */
export const ViewingOlderVersion: Story = {
  render: () => (
    <InteractiveVersionSelector options={taggedVersions} initialKey="3000000000000000033" showViewingChip />
  ),
};

/** Latest is the highest version, whatever the option order */
export const UnsortedUntaggedVersions: Story = {
  render: () => (
    <InteractiveVersionSelector
      options={[
        { key: '3000000000000000048', version: 2 },
        { key: '3000000000000000050', version: 10 },
        { key: '3000000000000000047', version: 1 },
      ]}
      initialKey="3000000000000000048"
      showViewingChip
    />
  ),
};

/** A long tag wraps, and is cut short after two lines; the number and latest marker stay visible */
export const LongTagInNarrowContainer: Story = {
  render: () => (
    <InteractiveVersionSelector
      options={[
        { key: '2', version: 2, versionTag: `release-${'LongIdentifier'.repeat(6)}` },
        { key: '1', version: 1 },
      ]}
      initialKey="2"
      width={240}
    />
  ),
};

/** While the version list loads, "latest" is unknown, so nothing is marked */
export const LatestUnknown: Story = {
  render: () => (
    <VersionSelector
      value="3000000000000000033"
      onChange={() => {}}
      options={[]}
      selectedOption={{ key: '3000000000000000033', version: 1, versionTag: 'release-1' }}
      disabled
    />
  ),
};
