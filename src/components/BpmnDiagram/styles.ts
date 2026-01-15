import type { SxProps, Theme } from '@mui/material';
import { themeColors } from '@base/theme';

/**
 * Container styles for the BPMN diagram
 */
export const getBpmnContainerStyles = (isInteractive: boolean): SxProps<Theme> => ({
  width: '100%',
  height: '100%',
  // Remove focus outlines
  '& *:focus': {
    outline: 'none',
  },
  '& .djs-container:focus': {
    outline: 'none',
  },
  '& .bpmn-overlay': {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    fontSize: '12px',
    borderRadius: '50%',
  },
  '& .count-badge': {
    width: '24px',
    height: '24px',
    color: 'white',
    cursor: 'pointer',
    boxShadow: `0 2px 4px ${themeColors.shadows.dark}`,
  },
  '& .running-badge': {
    backgroundColor: themeColors.bpmn.runningBadge,
  },
  '& .failed-badge': {
    backgroundColor: themeColors.bpmn.failedBadge,
  },
  // Highlight completed elements (green path)
  '& .element-completed .djs-visual rect, & .element-completed .djs-visual polygon, & .element-completed .djs-visual circle':
    {
      stroke: `${themeColors.bpmn.completedStroke} !important`,
      strokeWidth: '2px !important',
    },
  '& .element-completed .djs-visual path': {
    stroke: `${themeColors.bpmn.completedStroke} !important`,
  },
  // Highlight completed connections (sequence flows) - green path
  '& .connection-completed .djs-visual path': {
    stroke: `${themeColors.bpmn.completedStroke} !important`,
    strokeWidth: '2px !important',
  },
  // Highlight active elements - same glow effect as selected
  '& .element-active .djs-visual': {
    filter: `drop-shadow(0 0 4px ${themeColors.bpmn.selectionGlow}) drop-shadow(0 0 8px ${themeColors.bpmn.selectionGlowLight}) !important`,
  },
  // Highlight selected element (from filter) - shadow/glow effect
  '& .element-selected .djs-visual': {
    filter: `drop-shadow(0 0 4px ${themeColors.bpmn.selectionGlow}) drop-shadow(0 0 8px ${themeColors.bpmn.selectionGlowLight}) !important`,
  },
  // Interactive styles (hover effect and pointer cursor) - only when interactive
  ...(isInteractive && {
    // Hover effect for clickable elements - subtle glow with transition
    '& .djs-element:not(.djs-connection) .djs-visual': {
      transition: 'filter 170ms ease-in-out',
    },
    '& .djs-element:not(.djs-connection):not(.element-selected):hover .djs-visual': {
      filter: `drop-shadow(0 0 4px ${themeColors.bpmn.hoverGlow}) !important`,
    },
    // Pointer cursor for clickable elements
    '& .djs-element:not(.djs-connection)': {
      cursor: 'pointer !important',
    },
    '& .djs-element:not(.djs-connection) *': {
      cursor: 'pointer !important',
    },
    '& .djs-hit': {
      cursor: 'pointer !important',
    },
  }),
});
