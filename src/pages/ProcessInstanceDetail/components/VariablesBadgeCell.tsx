import { Box, Chip, Tooltip, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';

interface VariablesBadgeCellProps {
  inputVariables?: Record<string, unknown>;
  outputVariables?: Record<string, unknown>;
  /** Keys to strip from `inputVariables` (e.g. ['ZEN_FORM'] on the Jobs tab). */
  excludeFromInputKeys?: string[];
  /** Invoked on click when at least one side has entries. */
  onOpenDialog: (inputVariables: Record<string, unknown>, outputVariables: Record<string, unknown>) => void;
}

function countKeys(record: Record<string, unknown> | undefined, exclude: string[] = []): number {
  if (!record) return 0;
  if (exclude.length === 0) return Object.keys(record).length;
  return Object.keys(record).filter((k) => !exclude.includes(k)).length;
}

function stripKeys(
  record: Record<string, unknown> | undefined,
  exclude: string[],
): Record<string, unknown> {
  if (!record || exclude.length === 0) return record ?? {};
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(record)) {
    if (!exclude.includes(k)) result[k] = v;
  }
  return result;
}

/**
 * `In N` / `Out N` badge cell used in the Jobs and History tabs. Renders
 * `-` (non-clickable) when both counts are zero.
 */
export const VariablesBadgeCell = ({
  inputVariables,
  outputVariables,
  excludeFromInputKeys = [],
  onOpenDialog,
}: VariablesBadgeCellProps) => {
  const { t } = useTranslation([ns.processInstance]);

  const inCount = countKeys(inputVariables, excludeFromInputKeys);
  const outCount = countKeys(outputVariables);
  const hasAny = inCount > 0 || outCount > 0;

  if (!hasAny) {
    return (
      <Typography
        variant="body2"
        data-testid="variables-empty"
        sx={{
          fontFamily: '"SF Mono", Monaco, monospace',
          color: 'text.secondary',
        }}
      >
        -
      </Typography>
    );
  }

  const handleClick = () => {
    onOpenDialog(
      stripKeys(inputVariables, excludeFromInputKeys),
      outputVariables ?? {},
    );
  };

  return (
    <Tooltip title={t('processInstance:actions.viewInputOutput')} placement="top-start">
      <Box
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.75,
          cursor: 'pointer',
          borderRadius: '4px',
          '&:hover': { opacity: 0.75 },
          '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main' },
        }}
      >
        <Chip
          data-testid="variables-in-badge"
          label={`${t('processInstance:variables.in')} ${inCount}`}
          size="small"
          sx={{
            height: 20,
            fontSize: '0.7rem',
            fontFamily: '"SF Mono", Monaco, monospace',
            fontWeight: 600,
            bgcolor: 'info.light',
            color: 'info.dark',
            '& .MuiChip-label': { px: 0.75 },
          }}
        />
        <Chip
          data-testid="variables-out-badge"
          label={`${t('processInstance:variables.out')} ${outCount}`}
          size="small"
          sx={{
            height: 20,
            fontSize: '0.7rem',
            fontFamily: '"SF Mono", Monaco, monospace',
            fontWeight: 600,
            bgcolor: 'success.light',
            color: 'success.dark',
            '& .MuiChip-label': { px: 0.75 },
          }}
        />
      </Box>
    </Tooltip>
  );
};
