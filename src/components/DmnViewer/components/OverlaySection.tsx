import { Box, Typography } from '@mui/material';
import { OverlayVariable } from './OverlayVariable';
import { themeColors } from '@base/theme';

interface OverlaySectionProps {
  type: 'input' | 'output';
  variables: Array<{ name: string; value: unknown }>;
}

export const OverlaySection = ({ type, variables }: OverlaySectionProps) => {
  if (variables.length === 0) return null;

  const isInput = type === 'input';
  const color = isInput ? themeColors.info : themeColors.success;
  const label = isInput ? 'Input' : 'Output';

  return (
    <Box>
      <Box
        sx={{
          fontSize: '9px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          color,
          mb: '2px',
          display: 'flex',
          alignItems: 'center',
          gap: '3px',
        }}
      >
        {isInput && <Typography component="span" sx={{ fontSize: '10px' }}>→</Typography>}
        {label}
        {!isInput && <Typography component="span" sx={{ fontSize: '10px' }}>→</Typography>}
      </Box>
      {variables.slice(0, 3).map((v, i) => (
        <OverlayVariable key={i} name={v.name} value={v.value} />
      ))}
      {variables.length > 3 && (
        <Typography sx={{ fontSize: '9px', color: 'text.secondary' }}>
          +{variables.length - 3} more
        </Typography>
      )}
    </Box>
  );
};
