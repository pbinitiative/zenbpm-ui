import type { CSSProperties } from 'react';
import { createTheme } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface TypographyVariants {
    captionNormal: CSSProperties;
  }

  interface TypographyVariantsOptions {
    captionNormal?: CSSProperties;
  }
}

declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    captionNormal: true;
  }
}

// Design 3 - "Clean White" color palette
const colors = {
  // Primary green accent (from 4bpm.eu)
  primary: '#10bc69',
  primaryLight: '#14eb83',
  primaryDark: '#0d9956',
  primaryBg: '#e6f9f0',

  // Dark colors for text and buttons
  dark: '#1a1a1a',
  darkHover: '#333333',

  // Text colors
  textPrimary: '#1a1a1a',
  textSecondary: '#666666',
  textMuted: '#888888',
  textLight: '#999999',

  // Background colors
  bgWhite: '#ffffff',
  bgLight: '#fafafa',
  bgLighter: '#f7f7f7',
  bgGray: '#f5f5f5',
  bgHover: '#fafafa',

  // Border colors
  borderLight: '#f0f0f0',
  borderMedium: '#e5e5e5',
  borderDark: '#e0e0e0',

  // Status colors
  success: '#10bc69',
  successBg: '#e6f9f0',
  successText: '#0d9956',

  error: '#dc2626',
  errorBg: '#fef2f2',
  errorText: '#dc2626',
  errorBadge: '#ef5350',

  warning: '#f59e0b',
  warningBg: '#fef3c7',
  warningText: '#d97706',

  info: '#3b82f6',
  infoBg: '#eff6ff',
  infoText: '#2563eb',

  // Completed/neutral status
  completed: '#666666',
  completedBg: '#f5f5f5',

  // State badge colors (solid backgrounds with white text)
  stateBadge: {
    active: '#10bc69',      // Primary green
    completed: '#9E9E9E',   // Gray
    terminated: '#FFA726',  // Orange
    failed: '#EF5350',      // Red
    resolved: '#9E9E9E',    // Gray
    unresolved: '#EF5350',  // Red
    created: '#42A5F5',     // Blue
    canceled: '#FFA726',    // Orange
  },

  // BPMN Diagram colors
  bpmn: {
    // Element count badges
    runningBadge: '#10bc69',  // Primary green - matches app theme
    subscriptionBadge: '#f59e0b',
    failedBadge: '#d32f2f',
    // Completed elements stroke (green path)
    completedStroke: '#4caf50',
    // Selection, active, and hover (using primary green glow)
    selectionGlow: 'rgba(16, 188, 105, 0.8)',
    hoverGlow: 'rgba(16, 188, 105, 0.8)',
    // Selected element - distinct strong border
    selectedStroke: '#1976d2',
    selectedGlow: 'rgba(25, 118, 210, 0.6)',
  },

  // DMN Viewer colors
  dmn: {
    highlightBg: '#c8e6c9',           // Row/cell highlight
    panelBg: '#ffffff',               // Panel background
    panelBgGradient: '#f8f9fa',       // Panel gradient end
    borderStroke: '#9e9e9e',          // Border/arrow strokes
    handleBg: '#666666',              // Drag handle
    selectionBg: '#e8f4fc',           // Selected decision
    selectionBorder: '#52b0ec',       // Selection border
  },

  // Partition colors for tables
  partitionColors: [
    '#5C6BC0',  // Indigo
    '#26A69A',  // Teal
    '#7E57C2',  // Deep Purple
    '#42A5F5',  // Blue
    '#66BB6A',  // Green
    '#FFA726',  // Orange
    '#EC407A',  // Pink
    '#8D6E63',  // Brown
  ],

  // Design page illustration colors
  design: {
    // BPMN illustration
    bpmnPrimary: '#1976d2',
    bpmnSecondary: '#666666',
    bpmnBg: '#e3f2fd',
    // DMN illustration
    dmnPrimary: '#f57c00',
    dmnSecondary: '#666666',
    dmnBg: '#fff3e0',
    // Decision illustration
    decisionRed: '#d32f2f',
    decisionPurple: '#7b1fa2',
    decisionPurpleBg: '#f3e5f5',
    decisionPurpleLight: '#e1bee7',
    // Form illustration
    formPrimary: '#0288d1',
    formSecondary: '#666666',
    formBg: '#e1f5fe',
    // Common
    iconGray: '#666666',
    checkGreen: '#4caf50',
  },

  // Shadows and overlays
  shadows: {
    light: 'rgba(0, 0, 0, 0.1)',
    medium: 'rgba(0, 0, 0, 0.15)',
    dark: 'rgba(0, 0, 0, 0.2)',
  },

  // Overlay colors
  overlay: {
    loading: 'rgba(255, 255, 255, 0.7)',    // Semi-transparent white for loading states
    inputBorder: 'rgba(0, 0, 0, 0.23)',     // MUI standard outlined input border
  },
};

export const theme = createTheme({
  palette: {
    primary: {
      main: colors.primary,
      light: colors.primaryLight,
      dark: colors.primaryDark,
      contrastText: '#ffffff',
    },
    secondary: {
      main: colors.dark,
      light: colors.darkHover,
      dark: '#000000',
      contrastText: '#ffffff',
    },
    background: {
      default: colors.bgWhite,
      paper: colors.bgWhite,
    },
    text: {
      primary: colors.textPrimary,
      secondary: colors.textSecondary,
    },
    success: {
      main: colors.success,
      light: colors.successBg,
      dark: colors.successText,
    },
    error: {
      main: colors.error,
      light: colors.errorBg,
      dark: colors.errorText,
    },
    warning: {
      main: colors.warning,
      light: colors.warningBg,
      dark: colors.warningText,
    },
    info: {
      main: colors.info,
      light: colors.infoBg,
      dark: colors.infoText,
    },
    divider: colors.borderLight,
    grey: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#eeeeee',
      300: '#e0e0e0',
      400: '#bdbdbd',
      500: '#9e9e9e',
      600: '#757575',
      700: '#616161',
      800: '#424242',
      900: '#212121',
    },
  },
  typography: {
    fontFamily: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontWeight: 'var(--zb-page-title-weight)',
      fontSize: 'var(--zb-page-title-size)',
      letterSpacing: '-0.5px',
      color: 'var(--zb-text-primary)',
    },
    h2: {
      fontWeight: 700,
      fontSize: '1.75rem',
      letterSpacing: '-0.5px',
      color: 'var(--zb-text-primary)',
    },
    h3: {
      fontWeight: 700,
      fontSize: '1.5rem',
      letterSpacing: '-0.5px',
      color: 'var(--zb-text-primary)',
    },
    h4: {
      fontWeight: 700,
      fontSize: '1.25rem',
      letterSpacing: '-0.5px',
      color: 'var(--zb-text-primary)',
    },
    h5: {
      fontWeight: 600,
      fontSize: '1rem',
      color: 'var(--zb-text-primary)',
    },
    h6: {
      fontWeight: 600,
      fontSize: '0.875rem',
      color: 'var(--zb-text-primary)',
    },
    body1: {
      fontSize: 'var(--zb-body-font-size)',
      color: 'var(--zb-text-primary)',
    },
    body2: {
      fontSize: 'var(--zb-small-font-size)',
      color: 'var(--zb-text-secondary)',
    },
    subtitle1: {
      fontSize: '0.875rem',
      fontWeight: 500,
      color: 'var(--zb-text-muted)',
    },
    subtitle2: {
      fontSize: '0.75rem',
      fontWeight: 600,
      color: 'var(--zb-text-muted)',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    },
    caption: {
      fontSize: 'var(--zb-caption-font-size)',
      fontWeight: 600,
      color: 'var(--zb-text-muted)',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    },
    captionNormal: {
      fontSize: 'var(--zb-caption-font-size)',
      fontWeight: 600,
      color: 'var(--zb-text-muted)',
      textTransform: 'none',
      letterSpacing: '0.5px',
    },
    button: {
      fontWeight: 'var(--zb-button-font-weight)',
      fontSize: 'var(--zb-button-font-size)',
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        ':root': {
          '--zb-brand': colors.primary,
          '--zb-brand-dark': colors.primaryDark,
          '--zb-brand-light': colors.primaryLight,
          '--zb-brand-bg': colors.primaryBg,
          '--zb-brand-glow': 'rgba(16, 188, 105, 0.1)',
          '--zb-page-background': colors.bgWhite,
          '--zb-table-row-hover': colors.bgHover,
          '--zb-table-header': colors.bgLight,
          '--zb-table-header-text': colors.textMuted,
          '--zb-table-border': colors.borderLight,
          '--zb-text-muted': colors.textMuted,
          '--zb-text-primary': colors.textPrimary,
          '--zb-text-secondary': colors.textSecondary,
          '--zb-font-size': '16px',
          '--zb-button-font-size': '14px',
          '--zb-button-small-font-size': '12px',
          '--zb-button-font-weight': '500',
          '--zb-page-title-size': '28px',
          '--zb-page-title-weight': '700',
          '--zb-body-font-size': '14px',
          '--zb-small-font-size': '13px',
          '--zb-caption-font-size': '11px',
          '--zb-table-font-size': '13px',
          '--zb-table-header-font-size': '11px',
          '--zb-badge-success': colors.primary,
          '--zb-badge-success-text': '#ffffff',
          '--zb-badge-danger': colors.error,
          '--zb-badge-danger-text': '#ffffff',
          '--zb-badge-neutral': '#eeeeee',
          '--zb-badge-neutral-text': colors.textSecondary,
          '--zb-badge-soft': colors.successBg,
          '--zb-badge-soft-text': colors.successText,
          '--zb-pagination-selected': colors.primary,
          '--zb-pagination-selected-text': '#ffffff',
          '--zb-button-radius': '8px',
          '--zb-button-primary': colors.primary,
          '--zb-button-primary-hover': colors.primaryDark,
          '--zb-button-primary-text': '#ffffff',
          '--zb-button-secondary': colors.dark,
          '--zb-button-secondary-hover': colors.darkHover,
          '--zb-button-secondary-text': '#ffffff',
          '--zb-button-secondary-border': colors.dark,
          '--zb-button-secondary-hover-border': colors.darkHover,
          '--zb-button-delete': colors.error,
          '--zb-button-delete-hover': '#b91c1c',
          '--zb-button-delete-text': '#ffffff',
          '--zb-button-outlined-text': colors.textSecondary,
          '--zb-button-outlined-border': colors.borderDark,
          '--zb-button-outlined-hover': colors.bgGray,
          '--zb-button-outlined-hover-border': colors.textSecondary,
        },
        body: {
          backgroundColor: colors.bgWhite,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: colors.bgWhite,
          color: 'var(--zb-text-primary)',
          boxShadow: 'none',
          borderBottom: `1px solid ${colors.borderLight}`,
        },
      },
      defaultProps: {
        elevation: 0,
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          minHeight: '64px !important',
          padding: '0 40px !important',
          '@media (max-width: 600px)': {
            padding: '0 16px !important',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 'var(--zb-button-font-weight)',
          borderRadius: 'var(--zb-button-radius)',
          padding: '10px 20px',
          fontSize: 'var(--zb-button-font-size)',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        contained: {
          '&.MuiButton-containedPrimary:not(.Mui-disabled), &.MuiButton-colorPrimary:not(.Mui-disabled)': {
            backgroundColor: 'var(--zb-button-primary)',
            color: 'var(--zb-button-primary-text)',
            '&:hover': {
              backgroundColor: 'var(--zb-button-primary-hover)',
              color: 'var(--zb-button-primary-text)',
            },
          },
          '&.MuiButton-containedSecondary:not(.Mui-disabled), &.MuiButton-colorSecondary:not(.Mui-disabled)': {
            backgroundColor: 'var(--zb-button-secondary)',
            color: 'var(--zb-button-secondary-text)',
            border: '1px solid var(--zb-button-secondary-border)',
            '&:hover': {
              backgroundColor: 'var(--zb-button-secondary-hover)',
              borderColor: 'var(--zb-button-secondary-hover-border)',
              color: 'var(--zb-button-secondary-text)',
            },
          },
          '&.MuiButton-containedError:not(.Mui-disabled)': {
            backgroundColor: 'var(--zb-button-delete)',
            color: 'var(--zb-button-delete-text)',
            '&:hover': {
              backgroundColor: 'var(--zb-button-delete-hover)',
            },
          },
        },
        outlined: {
          '&:not(.Mui-disabled)': {
            color: 'var(--zb-button-outlined-text)',
            borderColor: 'var(--zb-button-outlined-border)',
            '&:hover': {
              color: 'var(--zb-button-outlined-text)',
              backgroundColor: 'var(--zb-button-outlined-hover)',
              borderColor: 'var(--zb-button-outlined-hover-border)',
            },
          },
          '&.MuiButton-outlinedPrimary:not(.Mui-disabled), &.MuiButton-outlinedSecondary:not(.Mui-disabled), &.MuiButton-outlinedInherit:not(.Mui-disabled)': {
            color: 'var(--zb-button-outlined-text)',
            borderColor: 'var(--zb-button-outlined-border)',
            '&:hover': {
              color: 'var(--zb-button-outlined-text)',
              borderColor: 'var(--zb-button-outlined-hover-border)',
              backgroundColor: 'var(--zb-button-outlined-hover)',
            },
          },
        },
        text: {
          color: colors.textSecondary,
          '&:hover': {
            backgroundColor: colors.bgGray,
          },
        },
        sizeSmall: {
          padding: '6px 12px',
          fontSize: 'var(--zb-button-small-font-size)',
          borderRadius: 'var(--zb-button-radius)',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: 'var(--zb-text-muted)',
          '&:hover': {
            backgroundColor: colors.bgGray,
          },
          '&.MuiIconButton-colorError': {
            color: 'var(--zb-button-delete)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          border: `1px solid ${colors.borderLight}`,
        },
        rounded: {
          borderRadius: 12,
        },
      },
      defaultProps: {
        elevation: 0,
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: 'none',
          border: `1px solid ${colors.borderLight}`,
        },
      },
    },
    MuiCardHeader: {
      styleOverrides: {
        root: {
          padding: '16px 20px',
          backgroundColor: colors.bgLight,
          borderBottom: `1px solid ${colors.borderLight}`,
        },
        title: {
          fontSize: '0.875rem',
          fontWeight: 600,
          color: 'var(--zb-text-primary)',
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '20px',
          '&:last-child': {
            paddingBottom: '20px',
          },
        },
      },
    },
    MuiTable: {
      styleOverrides: {
        root: {
          borderCollapse: 'collapse',
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: `1px solid ${colors.borderLight}`,
          overflow: 'hidden',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '16px 20px',
          fontSize: 'var(--zb-table-font-size)',
          borderBottom: '1px solid var(--zb-table-border)',
        },
        head: {
          fontWeight: 600,
          fontSize: 'var(--zb-table-header-font-size)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          color: 'var(--zb-table-header-text)',
          backgroundColor: 'var(--zb-table-header)',
          padding: '14px 20px',
          borderBottom: '1px solid var(--zb-table-border)',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: 'var(--zb-table-row-hover)',
          },
          '&:last-child td': {
            borderBottom: 'none',
          },
        },
      },
    },
    MuiTablePagination: {
      styleOverrides: {
        root: {
          backgroundColor: 'var(--zb-table-header)',
          borderTop: '1px solid var(--zb-table-border)',
        },
        toolbar: {
          padding: '16px 20px',
          minHeight: 'auto',
        },
        selectLabel: {
          fontSize: '0.8125rem',
          color: 'var(--zb-text-muted)',
        },
        displayedRows: {
          fontSize: '0.8125rem',
          color: 'var(--zb-text-muted)',
        },
      },
    },
    MuiPaginationItem: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            backgroundColor: 'var(--zb-pagination-selected)',
            color: 'var(--zb-pagination-selected-text)',
            '&:hover': {
              backgroundColor: 'var(--zb-pagination-selected)',
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 100,
          fontWeight: 600,
          fontSize: '0.75rem',
          height: 'auto',
          padding: '5px 12px',
        },
        label: {
          padding: 0,
        },
        sizeSmall: {
          padding: '4px 10px',
          fontSize: '0.6875rem',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            backgroundColor: colors.bgWhite,
            '& fieldset': {
              borderColor: colors.borderMedium,
            },
            '&:hover fieldset': {
              borderColor: colors.borderDark,
            },
            '&.Mui-focused fieldset': {
              borderColor: 'var(--zb-brand)',
              borderWidth: 1,
              boxShadow: '0 0 0 3px var(--zb-brand-glow)',
            },
          },
          '& .MuiInputBase-input': {
            padding: '10px 14px',
            fontSize: '0.875rem',
          },
          '& .MuiInputBase-input::placeholder': {
            color: 'var(--zb-text-muted)',
            opacity: 1,
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '& fieldset': {
            borderColor: colors.borderMedium,
          },
          '&:hover fieldset': {
            borderColor: colors.borderDark,
          },
          '&.Mui-focused fieldset': {
            borderColor: 'var(--zb-brand)',
            borderWidth: 1,
            boxShadow: '0 0 0 3px var(--zb-brand-glow)',
          },
        },
        input: {
          padding: '10px 14px',
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        select: {
          padding: '10px 14px',
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: colors.borderDark,
          '&.Mui-checked': {
            color: 'var(--zb-brand)',
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '0.875rem',
          minHeight: 44,
          padding: '10px 20px',
          color: colors.textSecondary,
          '&.Mui-selected': {
            color: 'var(--zb-text-primary)',
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 44,
        },
        indicator: {
          height: 2,
          backgroundColor: 'var(--zb-brand)',
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '0.875rem',
          padding: '10px 24px',
          borderRadius: 8,
          border: 'none',
          color: colors.textSecondary,
          backgroundColor: 'transparent',
          '&.Mui-selected': {
            backgroundColor: colors.bgWhite,
            color: 'var(--zb-text-primary)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            '&:hover': {
              backgroundColor: colors.bgWhite,
            },
          },
          '&:hover': {
            backgroundColor: colors.bgHover,
          },
        },
      },
    },
    MuiToggleButtonGroup: {
      styleOverrides: {
        root: {
          backgroundColor: colors.bgGray,
          borderRadius: 10,
          padding: 4,
          gap: 0,
        },
        grouped: {
          borderRadius: '8px !important',
          border: 'none !important',
          margin: 0,
          '&:not(:last-of-type)': {
            borderRadius: 8,
          },
          '&:not(:first-of-type)': {
            borderRadius: 8,
            marginLeft: 0,
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontSize: '1.125rem',
          fontWeight: 600,
          padding: '20px 24px',
          borderBottom: `1px solid ${colors.borderLight}`,
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: '24px',
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: '16px 24px',
          borderTop: `1px solid ${colors.borderLight}`,
          gap: 8,
        },
      },
    },
    MuiBreadcrumbs: {
      styleOverrides: {
        root: {
          fontSize: '0.8125rem',
          color: 'var(--zb-text-muted)',
        },
        separator: {
          margin: '0 8px',
        },
      },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          color: 'var(--zb-brand)',
          textDecoration: 'none',
          fontWeight: 500,
          '&:hover': {
            textDecoration: 'underline',
          },
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          width: 32,
          height: 32,
          fontSize: '0.75rem',
          fontWeight: 600,
          backgroundColor: 'var(--zb-brand)',
          color: colors.bgWhite,
        },
      },
    },
    MuiBadge: {
      styleOverrides: {
        badge: {
          fontSize: '0.625rem',
          fontWeight: 600,
          minWidth: 18,
          height: 18,
          borderRadius: 9,
          padding: '0 5px',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: colors.dark,
          fontSize: '0.75rem',
          padding: '8px 12px',
          borderRadius: 6,
        },
      },
    },
    MuiSnackbar: {
      styleOverrides: {
        root: {
          '& .MuiPaper-root': {
            borderRadius: 8,
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontSize: '0.875rem',
        },
        standardSuccess: {
          backgroundColor: colors.successBg,
          color: colors.successText,
        },
        standardError: {
          backgroundColor: colors.errorBg,
          color: colors.errorText,
        },
        standardWarning: {
          backgroundColor: colors.warningBg,
          color: colors.warningText,
        },
        standardInfo: {
          backgroundColor: colors.infoBg,
          color: colors.infoText,
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          backgroundColor: colors.bgGray,
          borderRadius: 4,
        },
        bar: {
          backgroundColor: 'var(--zb-brand)',
          borderRadius: 4,
        },
      },
    },
    MuiSkeleton: {
      styleOverrides: {
        root: {
          backgroundColor: colors.bgGray,
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          },
        },
        primary: {
          backgroundColor: 'var(--zb-brand)',
          '&:hover': {
            backgroundColor: 'var(--zb-brand-dark)',
          },
        },
        secondary: {
          backgroundColor: colors.dark,
          '&:hover': {
            backgroundColor: colors.darkHover,
          },
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          border: `1px solid ${colors.borderLight}`,
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
          padding: '10px 16px',
          '&:hover': {
            backgroundColor: colors.bgHover,
          },
          '&.Mui-selected': {
            backgroundColor: 'var(--zb-brand-bg)',
            '&:hover': {
              backgroundColor: 'var(--zb-brand-bg)',
            },
          },
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: colors.borderLight,
        },
      },
    },
  },
});

// Export color constants for use in components
export const themeColors = colors;
