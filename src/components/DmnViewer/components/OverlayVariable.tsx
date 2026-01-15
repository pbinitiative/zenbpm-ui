import { Box, Typography } from '@mui/material';

interface OverlayVariableProps {
  name: string;
  value: unknown;
}

// Helper to safely stringify any value
const stringify = (val: unknown): string => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') return JSON.stringify(val);
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean' || typeof val === 'bigint') {
    return val.toString();
  }
  if (typeof val === 'symbol') return val.toString();
  if (typeof val === 'function') return '[Function]';
  return '';
};

export const OverlayVariable = ({ name, value }: OverlayVariableProps) => {
  let valStr = stringify(value);
  if (valStr.length > 12) valStr = valStr.slice(0, 12) + '…';

  return (
    <Box
      sx={{
        fontSize: '10px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      <Typography
        component="span"
        sx={{ color: 'text.secondary', fontSize: 'inherit' }}
      >
        {name}:
      </Typography>{' '}
      <Typography
        component="span"
        sx={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 'inherit' }}
      >
        {valStr}
      </Typography>
    </Box>
  );
};
