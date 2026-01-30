import { useRef, useImperativeHandle, forwardRef } from 'react';
import { Box, CircularProgress } from '@mui/material';

// Import Camunda Platform modeler CSS (includes all required styles)
import 'camunda-bpmn-js/dist/assets/camunda-platform-modeler.css';

import type { BpmnEditorProps, BpmnEditorRef } from './types';
import { useBpmnEditor } from './hooks';
import {
  getContainerStyles,
  canvasContainerStyles,
  overlayStyles,
  canvasStyles,
  propertiesPanelStyles,
} from './styles';

export type { BpmnEditorProps, BpmnEditorRef };

export const BpmnEditor = forwardRef<BpmnEditorRef, BpmnEditorProps>(
  ({ initialXml, onChange, height = '100%' }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const propertiesPanelRef = useRef<HTMLDivElement>(null);

    const { loading, error, getXml, importXml, createNew, updateJsonFormProperty } = useBpmnEditor({
      containerRef,
      propertiesPanelRef,
      initialXml,
      onChange,
    });

    // Expose methods via ref
    useImperativeHandle(
      ref,
      () => ({
        getXml,
        importXml,
        createNew,
        updateJsonFormProperty,
      }),
      [getXml, importXml, createNew, updateJsonFormProperty]
    );

    return (
      <Box sx={getContainerStyles(height)}>
        {/* Canvas container */}
        <Box sx={canvasContainerStyles}>
          {loading && (
            <Box sx={overlayStyles}>
              <CircularProgress />
            </Box>
          )}
          {error && (
            <Box sx={{ ...overlayStyles, color: 'error.main' }}>
              {error}
            </Box>
          )}
          <Box ref={containerRef} sx={canvasStyles} />
        </Box>

        {/* Properties Panel */}
        <Box ref={propertiesPanelRef} sx={propertiesPanelStyles} />
      </Box>
    );
  }
);

BpmnEditor.displayName = 'BpmnEditor';
