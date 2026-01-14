import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Divider,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { StateBadge } from '@components/StateBadge';
import { MonoLink } from '@components/MonoLink';
import type { Incident } from '../IncidentsTable';

interface IncidentDetailModalProps {
  open: boolean;
  incident: Incident;
  onClose: () => void;
  onResolve?: (incidentKey: number) => void;
}

export const IncidentDetailModal = ({
  open,
  incident,
  onClose,
  onResolve,
}: IncidentDetailModalProps) => {
  const { t } = useTranslation([ns.common, ns.incidents, ns.processes]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {incident.resolvedAt ? (
            <CheckCircleIcon sx={{ color: 'success.main' }} />
          ) : (
            <ErrorIcon sx={{ color: 'error.main' }} />
          )}
          {t('incidents:detail.title')}
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {/* Key */}
          <DetailRow label={t('common:key')}>
            <Typography
              variant="body2"
              sx={{
                fontFamily: '"SF Mono", Monaco, monospace',
                fontSize: '0.75rem',
              }}
            >
              {incident.key}
            </Typography>
          </DetailRow>

          {/* State */}
          <DetailRow label={t('incidents:fields.state')}>
            <StateBadge
              state={incident.resolvedAt ? 'resolved' : 'unresolved'}
              label={incident.resolvedAt ? t('incidents:states.resolved') : t('incidents:states.unresolved')}
            />
          </DetailRow>

          {/* Element ID */}
          <DetailRow label={t('incidents:fields.elementId')}>
            <Typography variant="body2">{incident.elementId}</Typography>
          </DetailRow>

          {/* Process Instance */}
          <DetailRow label={t('incidents:fields.processInstance')}>
            <MonoLink to={`/process-instances/${incident.processInstanceKey}`}>
              {incident.processInstanceKey}
            </MonoLink>
          </DetailRow>

          {/* BPMN Process ID */}
          {incident.bpmnProcessId && (
            <DetailRow label={t('processes:fields.bpmnProcessId')}>
              <Typography variant="body2">{incident.bpmnProcessId}</Typography>
            </DetailRow>
          )}

          {/* Created At */}
          <DetailRow label={t('incidents:fields.createdAt')}>
            <Typography variant="body2">{formatDate(incident.createdAt)}</Typography>
          </DetailRow>

          {/* Resolved At */}
          {incident.resolvedAt && (
            <DetailRow label={t('incidents:fields.resolvedAt')}>
              <Typography variant="body2">{formatDate(incident.resolvedAt)}</Typography>
            </DetailRow>
          )}

          <Divider />

          {/* Error Message */}
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              {t('incidents:fields.errorMessage')}
            </Typography>
            <Box
              sx={{
                p: 1.5,
                bgcolor: 'error.50',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'error.200',
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontFamily: '"SF Mono", Monaco, monospace',
                  fontSize: '0.75rem',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}
              >
                {incident.message}
              </Typography>
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common:actions.close')}</Button>
        {!incident.resolvedAt && onResolve && (
          <Button
            variant="contained"
            color="warning"
            onClick={() => onResolve(incident.key)}
          >
            {t('incidents:actions.resolve')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

// Helper component
interface DetailRowProps {
  label: string;
  children: React.ReactNode;
}

const DetailRow = ({ label, children }: DetailRowProps) => (
  <Box>
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
      {label}
    </Typography>
    {children}
  </Box>
);

// Helper function
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return dateString;
  }
}
