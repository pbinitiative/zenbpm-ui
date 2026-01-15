import { useEffect } from 'react';
import { Box, CircularProgress, useMediaQuery, useTheme } from '@mui/material';

// Hooks
import { useBpmnViewer } from './hooks/useBpmnViewer';
import { useBpmnMarkers } from './hooks/useBpmnMarkers';

// Styles
import { getBpmnContainerStyles } from './styles';

// Types
import type { BpmnDiagramProps, BpmnCanvas } from './types';

// Re-export types
export type { BpmnDiagramProps, ElementStatistics } from './types';

export const BpmnDiagram = ({
  diagramData,
  elementStatistics,
  history = [],
  activeElements = [],
  selectedElement,
  onElementClick,
  height,
  minHeight = 250,
  interactive,
}: BpmnDiagramProps) => {
  // Default interactive to true if onElementClick is provided
  const isInteractive = interactive ?? !!onElementClick;

  // Responsive height based on screen size
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  // Calculate responsive height if not explicitly provided
  const responsiveHeight = height ?? (isMobile ? 280 : isTablet ? 350 : 450);

  // Initialize BPMN viewer
  const { containerRef, viewerRef, loading, error } = useBpmnViewer({
    diagramData,
    onElementClick,
  });

  // Manage markers and overlays
  useBpmnMarkers({
    viewerRef,
    loading,
    elementStatistics,
    history,
    activeElements,
    selectedElement,
  });

  // Re-zoom when container size changes (responsive resize)
  useEffect(() => {
    if (!viewerRef.current || loading) return;

    const canvas = viewerRef.current.get('canvas') as BpmnCanvas;

    // Small delay to let the container resize first
    const timeoutId = setTimeout(() => {
      try {
        canvas.zoom('fit-viewport');
      } catch {
        // Ignore errors if canvas is not ready
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [responsiveHeight, loading, viewerRef]);

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
      <Box ref={containerRef} sx={getBpmnContainerStyles(isInteractive)} />
    </Box>
  );
};
