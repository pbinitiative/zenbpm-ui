import { useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';
import Editor, { type OnMount } from '@monaco-editor/react';

type MonacoEditor = Parameters<OnMount>[0];

export interface JsonEditorProps {
  /** The JSON value as string */
  value: string;
  /** Called when the value changes */
  onChange: (value: string) => void;
  /** Height of the editor */
  height?: string | number;
  /** Minimum height of the editor */
  minHeight?: string | number;
  /** Whether the value is valid JSON */
  error?: boolean;
  /** Error message to display */
  errorMessage?: string;
  /** Helper text to display when no error */
  helperText?: string;
  /** Whether to show line numbers */
  lineNumbers?: boolean;
  /** Whether to show the prettify button */
  showPrettify?: boolean;
  /** Label for the editor */
  label?: string;
}

export const JsonEditor = ({
  value,
  onChange,
  height = 200,
  minHeight,
  error,
  errorMessage,
  helperText,
  lineNumbers: showLineNumbers = true,
  showPrettify = true,
  label,
}: JsonEditorProps) => {
  const { t } = useTranslation([ns.common]);
  const editorRef = useRef<MonacoEditor | null>(null);
  const isInternalChange = useRef(false);

  // Handle editor mount
  const handleEditorMount: OnMount = useCallback((editor) => {
    editorRef.current = editor;
  }, []);

  // Update editor value when prop changes externally (e.g., from prettify)
  useEffect(() => {
    if (editorRef.current && !isInternalChange.current) {
      const currentValue = editorRef.current.getValue();
      if (value !== currentValue) {
        editorRef.current.setValue(value);
      }
    }
    isInternalChange.current = false;
  }, [value]);

  // Prettify JSON
  const handlePrettify = useCallback(() => {
    try {
      const parsed: unknown = JSON.parse(value);
      const formatted = JSON.stringify(parsed, null, 2);
      onChange(formatted);
    } catch {
      // If JSON is invalid, don't do anything
    }
  }, [value, onChange]);

  // Check if JSON is valid (for prettify button state)
  const isValidJson = useCallback(() => {
    try {
      JSON.parse(value);
      return true;
    } catch {
      return false;
    }
  }, [value]);

  // Handle editor change - mark as internal to avoid re-setting value
  const handleEditorChange = useCallback((newValue: string | undefined) => {
    isInternalChange.current = true;
    onChange(newValue ?? '');
  }, [onChange]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, height, minHeight }}>
      {/* Header with label and prettify button */}
      {(label || showPrettify) && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {label && (
            <Typography
              component="label"
              variant="body2"
              sx={{
                fontWeight: 500,
                color: error ? 'error.main' : 'text.primary',
              }}
            >
              {label}
            </Typography>
          )}
          {showPrettify && (
            <Tooltip title={t('common:actions.prettify')}>
              <span>
                <IconButton
                  size="small"
                  onClick={handlePrettify}
                  disabled={!isValidJson()}
                  sx={{ p: 0.5 }}
                >
                  <FormatAlignLeftIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          )}
        </Box>
      )}

      {/* Editor container */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          width: '100%',
          border: 1,
          borderColor: error ? 'error.main' : 'divider',
          borderRadius: 1,
          overflow: 'hidden',
          '&:focus-within': {
            borderColor: error ? 'error.main' : 'primary.main',
            boxShadow: (theme) =>
              `0 0 0 3px ${error ? 'rgba(211, 47, 47, 0.1)' : theme.palette.primary.main + '1a'}`,
          },
        }}
      >
        <Editor
          height="100%"
          defaultLanguage="json"
          defaultValue={value}
          onMount={handleEditorMount}
          onChange={handleEditorChange}
          options={{
            minimap: { enabled: false },
            lineNumbers: showLineNumbers ? 'on' : 'off',
            scrollBeyondLastLine: false,
            fontSize: 13,
            fontFamily: '"SF Mono", Monaco, Consolas, monospace',
            tabSize: 2,
            automaticLayout: true,
            wordWrap: 'on',
            folding: true,
            renderLineHighlight: 'line',
            scrollbar: {
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
            },
            padding: { top: 8, bottom: 8 },
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            overviewRulerBorder: false,
          }}
          theme="light"
        />
      </Box>

      {/* Helper text / Error message */}
      {(errorMessage || helperText) && (
        <Typography
          variant="caption"
          sx={{
            color: error ? 'error.main' : 'text.secondary',
            ml: 1.5,
            fontSize: '0.75rem',
          }}
        >
          {error ? errorMessage : helperText}
        </Typography>
      )}
    </Box>
  );
};
