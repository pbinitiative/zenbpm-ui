import { useEffect } from 'react';
import { Box, CircularProgress, useMediaQuery, useTheme } from '@mui/material';
import type { DmnCanvas } from './types';

// Hooks
import { useDmnViewer } from './hooks/useDmnViewer';
import { useDmnOverlays } from './hooks/useDmnOverlays';

// Styles
import { getDmnContainerStyles } from './styles';

// Import dmn-js styles
import 'dmn-js/dist/assets/diagram-js.css';
import 'dmn-js/dist/assets/dmn-js-shared.css';
import 'dmn-js/dist/assets/dmn-js-drd.css';
import 'dmn-js/dist/assets/dmn-js-decision-table.css';
import 'dmn-js/dist/assets/dmn-js-decision-table-controls.css';
import 'dmn-js/dist/assets/dmn-js-literal-expression.css';
import 'dmn-js/dist/assets/dmn-font/css/dmn-embedded.css';

// Re-export types
export type { DecisionOverlay, DmnViewerProps } from './types';

interface DmnViewerProps {
  /** DMN XML data (string or base64 encoded) */
  diagramData: string;
  /** Height of the diagram container (default: responsive based on screen size) */
  height?: number | string;
  /** Minimum height of the diagram container */
  minHeight?: number | string;
  /** Callback when a decision element is clicked */
  onElementClick?: (elementId: string) => void;
  /** Overlays to show on decision elements */
  overlays?: Array<{
    decisionId: string;
    evaluated?: boolean;
    hasMatchedRules?: boolean;
    inputs?: Array<{ name: string; value: unknown }>;
    outputs?: Array<{ name: string; value: unknown }>;
    matchedRuleIndices?: number[];
  }>;
  /** Callback when a decision data panel is clicked */
  onOverlayClick?: (
    decisionId: string,
    inputs: Array<{ name: string; value: unknown }>,
    outputs: Array<{ name: string; value: unknown }>
  ) => void;
  /** Extra padding to account for overlays when zooming (default: 150 if overlays present) */
  overlayPadding?: number;
}

export const DmnViewer = ({
  diagramData,
  height,
  minHeight = 250,
  onElementClick,
  overlays,
  onOverlayClick,
  overlayPadding,
}: DmnViewerProps) => {
  // Responsive height based on screen size
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  // Calculate responsive height if not explicitly provided
  const responsiveHeight = height ?? (isMobile ? 280 : isTablet ? 350 : 400);

  // Initialize DMN viewer
  const { containerRef, viewerRef, loading, error, currentView } = useDmnViewer({
    diagramData,
    onElementClick,
  });

  // Manage overlays
  useDmnOverlays({
    viewerRef,
    overlays,
    loading,
    currentView,
    overlayPadding,
    containerRef,
    onOverlayClick,
  });

  // Re-zoom when container size changes (responsive resize)
  // Skip if overlays with data are present - they have their own zoom logic
  useEffect(() => {
    if (!viewerRef.current || loading) return;

    // Don't auto-zoom if overlays with data are present
    const hasOverlaysWithData = overlays?.some(
      (o) => o.evaluated && ((o.inputs && o.inputs.length > 0) || (o.outputs && o.outputs.length > 0))
    );
    if (hasOverlaysWithData) return;

    const activeViewer = viewerRef.current.getActiveViewer();
    if (!activeViewer) return;

    const canvas = activeViewer.get('canvas') as DmnCanvas;

    // Small delay to let the container resize first
    const timeoutId = setTimeout(() => {
      try {
        canvas.zoom('fit-viewport');
      } catch {
        // Ignore errors if canvas is not ready
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [responsiveHeight, loading, overlays, viewerRef]);

  return (
    <Box sx={{ position: 'relative', width: '100%', height: responsiveHeight, minHeight }}>
      {loading && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.paper',
            zIndex: 1,
          }}
        >
          <CircularProgress />
        </Box>
      )}
      {error && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.paper',
            color: 'error.main',
          }}
        >
          {error}
        </Box>
      )}
      <Box ref={containerRef} sx={getDmnContainerStyles(onElementClick)} />
    </Box>
  );
};
