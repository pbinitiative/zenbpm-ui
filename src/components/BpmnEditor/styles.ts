import type { SxProps, Theme } from '@mui/material';

export const getContainerStyles = (height: number | string): SxProps<Theme> => ({
  position: 'relative',
  width: '100%',
  height,
  minHeight: 400,
  display: 'flex',
});

export const canvasContainerStyles: SxProps<Theme> = {
  position: 'relative',
  flex: 1,
  minWidth: 0,
};

export const overlayStyles: SxProps<Theme> = {
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
};

export const canvasStyles: SxProps<Theme> = {
  width: '100%',
  height: '100%',
  // Remove focus outlines
  '& *:focus': {
    outline: 'none',
  },
  '& .djs-palette': {
    left: 10,
    top: 10,
  },
  '& .bjs-powered-by': {
    display: 'none',
  },
};

export const propertiesPanelStyles: SxProps<Theme> = {
  width: 320,
  height: '100%',
  borderLeft: 1,
  borderColor: 'divider',
  bgcolor: 'background.paper',
  overflowY: 'auto',
  flexShrink: 0,
  // Properties panel styling
  '& .bio-properties-panel': {
    height: '100%',
    '--properties-panel-width': '320px',
  },
};
