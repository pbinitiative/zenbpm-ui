import type { SxProps, Theme } from '@mui/material';
import { themeColors } from '@base/theme';

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
  // Style view switcher tabs
  '& .dmn-views': {
    display: 'flex',
    gap: '4px',
    padding: '8px',
    background: themeColors.bgLight,
    borderBottom: `1px solid ${themeColors.borderDark}`,
  },
  '& .dmn-view': {
    padding: '6px 12px',
    border: `1px solid ${themeColors.borderDark}`,
    borderRadius: '4px',
    background: themeColors.bgWhite,
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    color: themeColors.textPrimary,
    transition: 'all 0.2s ease',
    '&:hover': {
      background: themeColors.dmn.selectionBg,
      borderColor: themeColors.dmn.selectionBorder,
    },
  },
  '& .dmn-view.active': {
    background: themeColors.dmn.selectionBorder,
    borderColor: themeColors.dmn.selectionBorder,
    color: themeColors.bgWhite,
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
