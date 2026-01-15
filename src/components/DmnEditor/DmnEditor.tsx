import { useRef, useImperativeHandle, forwardRef } from 'react';
import { Box, CircularProgress } from '@mui/material';

// Import DMN modeler CSS
import 'dmn-js/dist/assets/diagram-js.css';
import 'dmn-js/dist/assets/dmn-js-shared.css';
import 'dmn-js/dist/assets/dmn-js-drd.css';
import 'dmn-js/dist/assets/dmn-js-decision-table.css';
import 'dmn-js/dist/assets/dmn-js-decision-table-controls.css';
import 'dmn-js/dist/assets/dmn-js-literal-expression.css';
import 'dmn-js/dist/assets/dmn-font/css/dmn-embedded.css';

// Import properties panel CSS
import 'dmn-js-properties-panel/dist/assets/properties-panel.css';

import type { DmnEditorProps, DmnEditorRef } from './types';
import { useDmnEditor } from './hooks';
import {
  getContainerStyles,
  canvasContainerStyles,
  overlayStyles,
  canvasStyles,
  propertiesPanelStyles,
} from './styles';

export type { DmnEditorProps, DmnEditorRef };

export const DmnEditor = forwardRef<DmnEditorRef, DmnEditorProps>(
  ({ initialXml, onChange, height = '100%' }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const propertiesPanelRef = useRef<HTMLDivElement>(null);

    const { loading, error, getXml, importXml, createNew } = useDmnEditor({
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
      }),
      [getXml, importXml, createNew]
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

DmnEditor.displayName = 'DmnEditor';
