import { Dialog, DialogTitle, DialogContent, Typography, IconButton, Box, Grid } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import type { OverlayDialogData } from '../types';

export interface InputOutputDialogProps {
  data: OverlayDialogData | null;
  onClose: () => void;
  getDecisionName: (decisionId: string) => string;
}

export const InputOutputDialog = ({ data, onClose, getDecisionName }: InputOutputDialogProps) => {
  const { t } = useTranslation([ns.decisions]);

  if (!data) return null;

  const formatData = (items: Array<{ name: string; value: unknown }>) => {
    return JSON.stringify(
      items.reduce<Record<string, unknown>>((acc, item) => {
        acc[item.name] = item.value;
        return acc;
      }, {}),
      null,
      2
    );
  };

  return (
    <Dialog open={data !== null} onClose={onClose} maxWidth="md" fullWidth>
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
          {getDecisionName(data.decisionId)}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Grid container spacing={2}>
          {/* Inputs */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Box
              sx={{
                p: 2,
                bgcolor: 'info.light',
                borderRadius: 2,
                height: '100%',
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  color: 'info.dark',
                  mb: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <Box sx={{ width: 12, height: 12, bgcolor: 'info.main', borderRadius: '2px' }} />
                {t('decisions:instance.inputs')}
              </Typography>
              {data.inputs.length > 0 ? (
                <Box
                  component="pre"
                  sx={{
                    p: 1.5,
                    bgcolor: 'white',
                    borderRadius: 1,
                    overflow: 'auto',
                    fontSize: '0.8rem',
                    fontFamily: 'monospace',
                    m: 0,
                    maxHeight: 300,
                  }}
                >
                  {formatData(data.inputs)}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {t('decisions:instance.noInputs')}
                </Typography>
              )}
            </Box>
          </Grid>

          {/* Outputs */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Box
              sx={{
                p: 2,
                bgcolor: 'success.light',
                borderRadius: 2,
                height: '100%',
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  color: 'success.dark',
                  mb: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <Box sx={{ width: 12, height: 12, bgcolor: 'success.main', borderRadius: '2px' }} />
                {t('decisions:instance.outputs')}
              </Typography>
              {data.outputs.length > 0 ? (
                <Box
                  component="pre"
                  sx={{
                    p: 1.5,
                    bgcolor: 'white',
                    borderRadius: 1,
                    overflow: 'auto',
                    fontSize: '0.8rem',
                    fontFamily: 'monospace',
                    m: 0,
                    maxHeight: 300,
                  }}
                >
                  {formatData(data.outputs)}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {t('decisions:instance.noOutputs')}
                </Typography>
              )}
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
    </Dialog>
  );
};
