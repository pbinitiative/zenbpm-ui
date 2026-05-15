import { Box, Chip, Tooltip, Typography } from '@mui/material';

const MAX_STRING_LENGTH = 80;

function buildPreview(value: Record<string, unknown> | unknown[]): string {
  if (Array.isArray(value)) {
    return `[ ${value.length} item${value.length !== 1 ? 's' : ''} ]`;
  }
  const keys = Object.keys(value);
  if (keys.length === 0) return '{ }';
  const shown = keys.slice(0, 3).join(', ');
  return keys.length > 3 ? `{ ${shown}, … }` : `{ ${shown} }`;
}

interface VariableValueCellProps {
  rawValue: unknown;
  /** Called when the user clicks on an object / array value — parent opens the modal. */
  onExpand: (value: unknown) => void;
}

/**
 * Type-aware variable value renderer for the Variables tab.
 *
 *  null / undefined → grey italic "null"
 *  boolean          → small green/red chip
 *  number           → primary-coloured monospace
 *  string           → quoted, truncated if long
 *  object / array   → key/item-count preview, clickable → modal
 */
export const VariableValueCell = ({ rawValue, onExpand }: VariableValueCellProps) => {
  // ── null ──────────────────────────────────────────────────────────────────
  if (rawValue === null || rawValue === undefined) {
    return (
      <Typography
        variant="body2"
        color="text.disabled"
        sx={{ fontStyle: 'italic', fontFamily: '"SF Mono", Monaco, monospace', fontSize: '0.75rem' }}
      >
        null
      </Typography>
    );
  }

  // ── boolean ───────────────────────────────────────────────────────────────
  if (typeof rawValue === 'boolean') {
    return (
      <Chip
        label={rawValue ? 'true' : 'false'}
        size="small"
        sx={{
          height: 20,
          fontSize: '0.7rem',
          fontFamily: '"SF Mono", Monaco, monospace',
          fontWeight: 600,
          bgcolor: rawValue ? 'success.light' : 'error.light',
          color: rawValue ? 'success.dark' : 'error.dark',
        }}
      />
    );
  }

  // ── number ────────────────────────────────────────────────────────────────
  if (typeof rawValue === 'number') {
    return (
      <Typography
        variant="body2"
        sx={{ fontFamily: '"SF Mono", Monaco, monospace', fontSize: '0.75rem', color: 'primary.main' }}
      >
        {rawValue}
      </Typography>
    );
  }

  // ── string ────────────────────────────────────────────────────────────────
  if (typeof rawValue === 'string') {
    const isLong = rawValue.length > MAX_STRING_LENGTH;
    const display = isLong
      ? `"${rawValue.slice(0, MAX_STRING_LENGTH)}…"`
      : `"${rawValue}"`;

    if (isLong) {
      return (
        <Tooltip title="Click to view full value" placement="top-start">
          <Box
            role="button"
            tabIndex={0}
            onClick={() => onExpand(rawValue)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onExpand(rawValue);
              }
            }}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              cursor: 'pointer',
              borderRadius: '4px',
              '&:hover': { opacity: 0.7 },
              '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main' },
            }}
          >
            <Typography
              variant="body2"
              sx={{
                fontFamily: '"SF Mono", Monaco, monospace',
                fontSize: '0.75rem',
                color: 'success.dark',
                wordBreak: 'break-all',
              }}
            >
              {display}
            </Typography>
          </Box>
        </Tooltip>
      );
    }

    return (
      <Typography
        variant="body2"
        sx={{
          fontFamily: '"SF Mono", Monaco, monospace',
          fontSize: '0.75rem',
          color: 'success.dark',
          wordBreak: 'break-all',
        }}
      >
        {display}
      </Typography>
    );
  }

  // ── object / array ────────────────────────────────────────────────────────
  if (typeof rawValue === 'object') {
    const preview = buildPreview(rawValue as Record<string, unknown> | unknown[]);

    return (
      <Tooltip title="Click to view full value" placement="top-start">
        <Box
          role="button"
          tabIndex={0}
          onClick={() => onExpand(rawValue)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onExpand(rawValue);
            }
          }}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            cursor: 'pointer',
            borderRadius: '4px',
            '&:hover': { opacity: 0.7 },
            '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main' },
          }}
        >
          <Typography
            variant="body2"
            sx={{
              fontFamily: '"SF Mono", Monaco, monospace',
              fontSize: '0.75rem',
              color: 'info.main',
              fontWeight: 500,
            }}
          >
            {preview}
          </Typography>
        </Box>
      </Tooltip>
    );
  }

  // ── fallback ──────────────────────────────────────────────────────────────
  return (
    <Typography variant="body2" sx={{ fontFamily: '"SF Mono", Monaco, monospace', fontSize: '0.75rem' }}>
      {String(rawValue)}
    </Typography>
  );
};
