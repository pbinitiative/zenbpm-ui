import { Dialog, DialogTitle, DialogContent, Typography, IconButton, Box, Grid } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';

export interface InputOutputDialogInput {
  name: string;
  value: unknown;
}

export interface InputOutputDialogData {
  title?: string;
  inputs?: InputOutputDialogInput[];
  outputs?: Array<Record<string, unknown>>;
  inputVariables?: Record<string, unknown>;
  outputVariables?: Record<string, unknown>;
}

export interface InputOutputDialogProps {
  open: boolean;
  data: InputOutputDialogData | null;
  onClose: () => void;
}

export const InputOutputDialog = ({ data, onClose }: InputOutputDialogProps) => {
  const { t } = useTranslation([ns.decisions]);

  if (!data) return null;

  const formatEntries = (items: Array<{ name: string; value: unknown }>) =>
    JSON.stringify(
      items.reduce<Record<string, unknown>>((acc, item) => {
        acc[item.name] = item.value;
        return acc;
      }, {}),
      null,
      2
    );

  const formatRecord = (record: Record<string, unknown> | undefined) =>
    record ? JSON.stringify(record, null, 2) : '';

  const formatOutputs = (outputs: Array<Record<string, unknown>> | undefined) => {
    if (!outputs || outputs.length === 0) return '';
    if (outputs.length === 1) return JSON.stringify(outputs[0], null, 2);
    return JSON.stringify(outputs, null, 2);
  };

  const hasInputs = (data.inputs && data.inputs.length > 0) || (data.inputVariables && Object.keys(data.inputVariables).length > 0);
  const hasOutputs =
    (data.outputs && data.outputs.length > 0) ||
    (data.outputVariables && Object.keys(data.outputVariables).length > 0);

  const inputsContent = data.inputs
    ? formatEntries(data.inputs)
    : data.inputVariables
      ? formatRecord(data.inputVariables)
      : '';

  const outputsContent = data.outputs && data.outputs.length > 0
    ? formatOutputs(data.outputs)
    : data.outputVariables
      ? formatRecord(data.outputVariables)
      : '';

  return (
    <Dialog
      open={data !== null}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      data-testid="input-output-dialog"
    >
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
          {data.title || ''}
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
              {hasInputs ? (
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
                  {inputsContent}
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
              {hasOutputs ? (
                <Box
                  component="pre"
                  data-testid="outputs-content"
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
                  {outputsContent}
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
