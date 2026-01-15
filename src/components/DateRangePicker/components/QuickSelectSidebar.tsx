import { Box, Typography, List, ListItemButton, ListItemText } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import type { QuickSelectOption } from '../types';

interface QuickSelectSidebarProps {
  options: QuickSelectOption[];
  onSelect: (option: QuickSelectOption) => void;
}

export const QuickSelectSidebar = ({ options, onSelect }: QuickSelectSidebarProps) => {
  const { t } = useTranslation([ns.common]);

  return (
    <Box
      sx={{
        width: 180,
        borderRight: '1px solid',
        borderColor: 'divider',
        bgcolor: 'grey.50',
        maxHeight: 450,
        overflow: 'auto',
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          px: 1.5,
          pt: 1.5,
          pb: 0.5,
          display: 'block',
          fontWeight: 600,
          textTransform: 'uppercase',
          fontSize: '0.7rem',
        }}
      >
        {t('common:dateRange.quickSelectTitle')}
      </Typography>
      <List dense disablePadding>
        {options.map((option) => (
          <ListItemButton
            key={option.label}
            onClick={() => onSelect(option)}
            sx={{ py: 0.5, px: 1.5 }}
          >
            <ListItemText
              primary={option.label}
              slotProps={{ primary: { variant: 'body2', fontSize: '0.8rem' } }}
            />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
};
