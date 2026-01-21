import { useRef } from 'react';
import { Box, Snackbar, Alert, CircularProgress } from '@mui/material';
import { ConsolePanel } from './ConsolePanel';
import { DesignerToolbar } from './DesignerToolbar';
import type { EditorMode, ConsoleMessage } from './types';

export interface DesignerShellProps {
  /** Whether definition is loading */
  loading?: boolean;
  /** Current editor mode */
  editorMode: EditorMode;
  /** Whether deployment is in progress */
  deploying: boolean;
  /** Console messages */
  consoleMessages: ConsoleMessage[];
  /** Whether console is open */
  consoleOpen: boolean;
  /** Snackbar state */
  snackbar: {
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  };
  /** File input accept types (e.g., ".bpmn,.xml" or ".dmn,.xml") */
  fileAccept: string;
  /** Icon for diagram mode toggle button */
  diagramModeIcon: React.ReactNode;
  /** Test ID prefix for data-testid attributes */
  testIdPrefix: string;
  /** Called when editor mode changes */
  onModeChange: (event: React.MouseEvent<HTMLElement>, newMode: EditorMode | null) => void;
  /** Called when a file is uploaded */
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  /** Called when Download button is clicked */
  onDownload: () => void;
  /** Called when Deploy button is clicked */
  onDeploy: () => void;
  /** Called when Console button is clicked */
  onToggleConsole: () => void;
  /** Called to clear console messages */
  onClearConsole: () => void;
  /** Called when snackbar is closed */
  onCloseSnackbar: () => void;
  /** The diagram editor element (shown when editorMode === 'diagram') */
  diagramEditor: React.ReactNode;
  /** The XML editor element (shown when editorMode === 'xml') */
  xmlEditor: React.ReactNode;
}

export const DesignerShell = ({
  loading = false,
  editorMode,
  deploying,
  consoleMessages,
  consoleOpen,
  snackbar,
  fileAccept,
  diagramModeIcon,
  testIdPrefix,
  onModeChange,
  onFileUpload,
  onDownload,
  onDeploy,
  onToggleConsole,
  onClearConsole,
  onCloseSnackbar,
  diagramEditor,
  xmlEditor,
}: DesignerShellProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenFile = () => {
    fileInputRef.current?.click();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 80px)' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }} data-testid={`${testIdPrefix}-page`}>
      {/* Hidden file input */}
      <Box
        component="input"
        ref={fileInputRef}
        type="file"
        accept={fileAccept}
        onChange={onFileUpload}
        sx={{ display: 'none' }}
        data-testid={`${testIdPrefix}-file-input`}
      />

      {/* Editor container */}
      <Box
        sx={{
          flexGrow: 1,
          border: 1,
          borderColor: 'divider',
          borderRadius: '4px 4px 0 0',
          overflow: 'hidden',
          bgcolor: 'background.paper',
          position: 'relative',
        }}
        data-testid={`${testIdPrefix}-editor-container`}
      >
        {/* Diagram Editor - always mounted, hidden when in XML mode */}
        <Box
          sx={{
            width: '100%',
            height: '100%',
            display: editorMode === 'diagram' ? 'block' : 'none',
          }}
        >
          {diagramEditor}
        </Box>

        {/* XML Editor - shown when in XML mode */}
        {editorMode === 'xml' && xmlEditor}

        {/* Console Panel */}
        <ConsolePanel
          messages={consoleMessages}
          open={consoleOpen}
          onClear={onClearConsole}
          onClose={onToggleConsole}
        />
      </Box>

      {/* Bottom toolbar */}
      <DesignerToolbar
        editorMode={editorMode}
        deploying={deploying}
        consoleOpen={consoleOpen}
        consoleMessageCount={consoleMessages.length}
        diagramModeIcon={diagramModeIcon}
        onModeChange={onModeChange}
        onOpenFile={handleOpenFile}
        onDownload={onDownload}
        onDeploy={onDeploy}
        onToggleConsole={onToggleConsole}
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={onCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={onCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
