import type { SxProps, Theme } from '@mui/material';
import { themeColors } from '@base/theme';

/**
 * Container styles for the DMN viewer
 */
export const getDmnContainerStyles = (onElementClick?: (elementId: string) => void): SxProps<Theme> => ({
  width: '100%',
  height: '100%',
  // Override some dmn-js styles to fit our design
  '& .dmn-js-parent': {
    height: '100%',
  },
  // Style the view switcher tabs (blue like Camunda Modeler)
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
  // DRD container
  '& .dmn-drd-container': {
    height: 'calc(100% - 45px)',
  },
  // Hide the DRD name/ID label in top-left corner
  '& .dmn-definitions': {
    display: 'none !important',
  },
  '& .djs-direct-editing-parent': {
    display: 'none !important',
  },
  '& .bjs-powered-by': {
    display: 'none !important',
  },
  // Decision table container
  '& .dmn-decision-table-container': {
    height: 'calc(100% - 45px)',
    overflow: 'auto',
  },
  // Remove focus outlines
  '& *:focus': {
    outline: 'none',
  },
  // Make decision elements clickable when handler is provided
  ...(onElementClick && {
    '& .djs-element:not(.djs-connection)': {
      cursor: 'pointer !important',
    },
    '& .djs-element:not(.djs-connection) *': {
      cursor: 'pointer !important',
    },
  }),
});
