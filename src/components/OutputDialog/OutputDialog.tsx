import { Dialog, DialogTitle, DialogContent, Typography, IconButton, Box } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

export interface OutputDialogProps {
  open: boolean;
  onClose: () => void;
  output?: unknown;
  title?: string;
  /** Show `output` as JSON even when it is a string, which is then quoted */
  json?: boolean;
}

export const OutputDialog = ({ open, onClose, output, title, json = false }: OutputDialogProps) => {
  const text = typeof output === 'string' && !json;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth data-testid="output-dialog">
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
          {title ?? ''}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Box
          component="pre"
          data-testid="output-dialog-content"
          sx={{
            p: 2,
            bgcolor: 'grey.100',
            borderRadius: 1,
            overflow: 'auto',
            fontSize: '0.875rem',
            fontFamily: text ? 'inherit' : 'monospace',
            whiteSpace: text ? 'pre-wrap' : 'pre',
            m: 0,
          }}
        >
          {text ? output : JSON.stringify(output, null, 2)}
        </Box>
      </DialogContent>
    </Dialog>
  );
};
