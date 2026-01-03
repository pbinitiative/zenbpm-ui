import { Box, Divider } from '@mui/material';
import { OverlaySection } from './OverlaySection';

interface DecisionDataOverlayProps {
  inputs: Array<{ name: string; value: unknown }>;
  outputs: Array<{ name: string; value: unknown }>;
}

export const DecisionDataOverlay = ({ inputs, outputs }: DecisionDataOverlayProps) => {
  const hasInputs = inputs.length > 0;
  const hasOutputs = outputs.length > 0;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}
    >
      {hasInputs && <OverlaySection type="input" variables={inputs} />}
      {hasInputs && hasOutputs && (
        <Divider sx={{ borderColor: '#e0e0e0' }} />
      )}
      {hasOutputs && <OverlaySection type="output" variables={outputs} />}
    </Box>
  );
};
