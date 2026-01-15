import { Box, TableCell, TableRow, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import { themeColors } from '@base/theme';
import { getPartitionColor } from '../utils/partitionColor';

interface PartitionHeaderProps {
  partition: number;
  count?: number;
  page: number;
  pageSize: number;
  colSpan: number;
}

export const PartitionHeader = ({ partition, count, page, pageSize, colSpan }: PartitionHeaderProps) => {
  const { t } = useTranslation([ns.common]);

  const renderPaginationInfo = () => {
    if (count === undefined || count === 0) return null;

    const startItem = page * pageSize + 1;
    const isOutOfRange = startItem > count;

    if (isOutOfRange) {
      return (
        <Typography
          sx={{
            fontSize: '0.75rem',
            color: 'error.main',
            bgcolor: 'error.lighter',
            px: 1,
            py: 0.25,
            borderRadius: 0.5,
            fontFamily: 'monospace',
          }}
        >
          {startItem} &gt; {count}
        </Typography>
      );
    }

    const endItem = Math.min((page + 1) * pageSize, count);
    return (
      <Typography
        sx={{
          fontSize: '0.75rem',
          color: themeColors.textMuted,
          fontFamily: 'monospace',
        }}
      >
        {startItem}–{endItem} of {count}
      </Typography>
    );
  };

  return (
    <TableRow
      data-testid="partition-header"
      sx={{
        bgcolor: themeColors.bgLight,
        '& td': {
          borderBottom: `1px solid ${themeColors.borderLight}`,
        },
      }}
    >
      <TableCell colSpan={colSpan} sx={{ py: 1, px: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: getPartitionColor(partition),
              }}
            />
            <Typography
              sx={{
                fontWeight: 600,
                fontSize: '0.8125rem',
                color: themeColors.textSecondary,
              }}
            >
              {t('common:table.partition')} {partition}
            </Typography>
          </Box>
          {renderPaginationInfo()}
        </Box>
      </TableCell>
    </TableRow>
  );
};
