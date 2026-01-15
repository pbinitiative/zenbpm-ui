import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import { Box, Button, CircularProgress, ToggleButtonGroup, ToggleButton } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import CodeIcon from '@mui/icons-material/Code';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import type { EditorMode } from '../types';

interface DesignerToolbarProps {
  editorMode: EditorMode;
  deploying: boolean;
  onModeChange: (event: React.MouseEvent<HTMLElement>, newMode: EditorMode | null) => void;
  onOpenFile: () => void;
  onDownload: () => void;
  onDeploy: () => void;
}

export const DesignerToolbar = ({
  editorMode,
  deploying,
  onModeChange,
  onOpenFile,
  onDownload,
  onDeploy,
}: DesignerToolbarProps) => {
  const { t } = useTranslation([ns.designer]);

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        px: 1.5,
        py: 0.75,
        bgcolor: 'grey.100',
        borderRadius: '0 0 4px 4px',
        border: 1,
        borderTop: 0,
        borderColor: 'divider',
      }}
    >
      {/* Left side - Mode toggle */}
      <ToggleButtonGroup value={editorMode} exclusive onChange={onModeChange} size="small">
        <ToggleButton value="diagram" sx={{ px: 1.5 }}>
          <AccountTreeIcon fontSize="small" sx={{ mr: 0.5 }} />
          {t('designer:modes.diagram')}
        </ToggleButton>
        <ToggleButton value="xml" sx={{ px: 1.5 }}>
          <CodeIcon fontSize="small" sx={{ mr: 0.5 }} />
          {t('designer:modes.xml')}
        </ToggleButton>
      </ToggleButtonGroup>

      {/* Right side - Actions */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Button onClick={onOpenFile} size="small" variant="outlined" startIcon={<FolderOpenIcon />}>
          {t('designer:actions.import')}
        </Button>
        <Button onClick={onDownload} size="small" variant="outlined" startIcon={<FileDownloadIcon />}>
          {t('designer:actions.download')}
        </Button>
        <Button
          onClick={onDeploy}
          size="small"
          variant="contained"
          disabled={deploying}
          startIcon={deploying ? <CircularProgress size={16} color="inherit" /> : <CloudUploadIcon />}
        >
          {t('designer:actions.deploy')}
        </Button>
      </Box>
    </Box>
  );
};
