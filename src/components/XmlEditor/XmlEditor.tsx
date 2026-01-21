import { useCallback, useRef, useEffect } from 'react';
import { Box } from '@mui/material';
import Editor, { type OnMount } from '@monaco-editor/react';

type MonacoEditor = Parameters<OnMount>[0];

interface XmlEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: string | number;
}

export const XmlEditor = ({ value, onChange, height = '100%' }: XmlEditorProps) => {
  const editorRef = useRef<MonacoEditor | null>(null);
  const isInternalChange = useRef(false);

  // Handle editor mount
  const handleEditorMount: OnMount = useCallback((editor) => {
    editorRef.current = editor;
  }, []);

  // Update editor value when prop changes externally
  useEffect(() => {
    if (editorRef.current && !isInternalChange.current) {
      const currentValue = editorRef.current.getValue();
      if (value !== currentValue) {
        editorRef.current.setValue(value);
      }
    }
    isInternalChange.current = false;
  }, [value]);

  // Handle editor change - mark as internal to avoid re-setting value
  const handleEditorChange = useCallback((newValue: string | undefined) => {
    isInternalChange.current = true;
    onChange(newValue ?? '');
  }, [onChange]);

  return (
    <Box
      sx={{
        height,
        width: '100%',
      }}
    >
      <Editor
        height="100%"
        defaultLanguage="xml"
        defaultValue={value}
        onMount={handleEditorMount}
        onChange={handleEditorChange}
        options={{
          minimap: { enabled: false },
          lineNumbers: 'on',
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
  );
};
