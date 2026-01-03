import type { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';

export interface MetadataItemProps {
  /** Label text displayed above the value */
  label: string;
  /** Value to display - can be string or ReactNode */
  value: ReactNode;
  /** Whether to use monospace font for string values */
  mono?: boolean;
}

/**
 * A reusable component for displaying metadata key-value pairs.
 * Used in detail page metadata panels.
 */
export const MetadataItem = ({ label, value, mono }: MetadataItemProps) => (
  <Box>
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
      {label}
    </Typography>
    {typeof value === 'string' ? (
      <Typography
        variant="body2"
        sx={{
          fontWeight: 500,
          fontFamily: mono ? '"SF Mono", Monaco, monospace' : undefined,
          fontSize: mono ? '0.75rem' : undefined,
          wordBreak: 'break-all',
        }}
      >
        {value}
      </Typography>
    ) : (
      value
    )}
  </Box>
);
