import { Box, Typography } from '@mui/material';

interface OverlayVariableProps {
  name: string;
  value: unknown;
}

export const OverlayVariable = ({ name, value }: OverlayVariableProps) => {
  let valStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
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
        sx={{ color: '#666', fontSize: 'inherit' }}
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
