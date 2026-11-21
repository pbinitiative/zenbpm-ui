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
  '& .subscription-badge': {
    backgroundColor: themeColors.bpmn.subscriptionBadge,
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
  // Highlight active elements - green glow. One drop-shadow on purpose: where Chrome rasterizes
  // on the GPU, a chain of two draws stray pieces of a large element, such as an expanded
  // sub-process, beside it: a cut-off copy of its label and fragments of its border.
  '& .element-active .djs-visual': {
    filter: `drop-shadow(0 0 6px ${themeColors.bpmn.selectionGlow}) !important`,
  },
  // Highlight selected element - strong border stroke to distinguish from active
  '& .element-selected .djs-visual rect, & .element-selected .djs-visual polygon, & .element-selected .djs-visual circle':
  {
    stroke: `${themeColors.bpmn.selectedStroke} !important`,
  },
  '& .element-selected .djs-visual path': {
    stroke: `${themeColors.bpmn.selectedStroke} !important`,
  },
  '& .element-selected .djs-visual': {
    filter: `drop-shadow(0 0 6px ${themeColors.bpmn.selectedGlow}) !important`,
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
