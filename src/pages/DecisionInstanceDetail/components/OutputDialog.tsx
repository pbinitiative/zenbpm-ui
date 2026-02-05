import { Dialog, DialogTitle, DialogContent, Typography, IconButton, Box } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';

export interface OutputDialogProps {
  open: boolean;
  onClose: () => void;
  output: unknown;
}

export const OutputDialog = ({ open, onClose, output }: OutputDialogProps) => {
  const { t } = useTranslation([ns.decisions]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Typography variant="h6" sx={{ fontSize: '1rem' }}>
          {t('decisions:instance.finalOutput')}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Box
          component="pre"
          sx={{
            p: 2,
            bgcolor: 'grey.100',
            borderRadius: 1,
            overflow: 'auto',
            fontSize: '0.875rem',
            fontFamily: 'monospace',
            m: 0,
          }}
        >
          {JSON.stringify(output, null, 2)}
        </Box>
      </DialogContent>
    </Dialog>
  );
};
