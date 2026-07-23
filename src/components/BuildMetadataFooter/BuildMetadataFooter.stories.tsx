import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { frontendBuildMetadata } from '@base/buildMetadata';
import { BuildMetadataFooter } from './BuildMetadataFooter';

const meta: Meta<typeof BuildMetadataFooter> = {
  title: 'Components/BuildMetadataFooter',
  component: BuildMetadataFooter,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof BuildMetadataFooter>;

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});
queryClient.setQueryData(['systemStatus', 'buildMetadata'], frontendBuildMetadata);

export const MatchingBuilds: Story = {
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <Story />
      </QueryClientProvider>
    ),
  ],
};
