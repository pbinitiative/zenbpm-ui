import { createTheme, alpha } from '@mui/material/styles';

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
    failedBadge: '#d32f2f',
    // Completed elements stroke (green path)
    completedStroke: '#4caf50',
    // Selection, active, and hover (using primary green glow)
    selectionGlow: 'rgba(16, 188, 105, 0.8)',
    selectionGlowLight: 'rgba(16, 188, 105, 0.5)',
    hoverGlow: 'rgba(16, 188, 105, 0.8)',
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
      fontWeight: 700,
      fontSize: '2rem',
      letterSpacing: '-0.5px',
      color: colors.textPrimary,
    },
    h2: {
      fontWeight: 700,
      fontSize: '1.75rem',
      letterSpacing: '-0.5px',
      color: colors.textPrimary,
    },
    h3: {
      fontWeight: 700,
      fontSize: '1.5rem',
      letterSpacing: '-0.5px',
      color: colors.textPrimary,
    },
    h4: {
      fontWeight: 700,
      fontSize: '1.25rem',
      letterSpacing: '-0.5px',
      color: colors.textPrimary,
    },
    h5: {
      fontWeight: 600,
      fontSize: '1rem',
      color: colors.textPrimary,
    },
    h6: {
      fontWeight: 600,
      fontSize: '0.875rem',
      color: colors.textPrimary,
    },
    body1: {
      fontSize: '0.875rem',
      color: colors.textPrimary,
    },
    body2: {
      fontSize: '0.8125rem',
      color: colors.textSecondary,
    },
    subtitle1: {
      fontSize: '0.875rem',
      fontWeight: 500,
      color: colors.textMuted,
    },
    subtitle2: {
      fontSize: '0.75rem',
      fontWeight: 600,
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    },
    caption: {
      fontSize: '0.6875rem',
      fontWeight: 600,
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    },
    button: {
      fontWeight: 500,
      fontSize: '0.875rem',
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: colors.bgWhite,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: colors.bgWhite,
          color: colors.textPrimary,
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
          fontWeight: 500,
          borderRadius: 8,
          padding: '10px 20px',
          fontSize: '0.875rem',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        contained: {
          '&.MuiButton-containedPrimary': {
            backgroundColor: colors.primary,
            '&:hover': {
              backgroundColor: colors.primaryDark,
            },
          },
          '&.MuiButton-containedSecondary': {
            backgroundColor: colors.dark,
            '&:hover': {
              backgroundColor: colors.darkHover,
            },
          },
        },
        outlined: {
          borderColor: colors.borderDark,
          '&:hover': {
            backgroundColor: colors.bgGray,
          },
          '&.MuiButton-outlinedPrimary': {
            color: colors.textSecondary,
            borderColor: colors.borderDark,
            '&:hover': {
              color: colors.textPrimary,
              borderColor: colors.textSecondary,
              backgroundColor: colors.bgGray,
            },
          },
          '&.MuiButton-outlinedSecondary': {
            color: colors.textSecondary,
            borderColor: colors.borderDark,
            '&:hover': {
              borderColor: colors.borderDark,
              backgroundColor: colors.bgGray,
            },
          },
          '&.MuiButton-outlinedInherit': {
            color: colors.textSecondary,
            borderColor: colors.borderDark,
            '&:hover': {
              borderColor: colors.borderDark,
              backgroundColor: colors.bgGray,
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
          fontSize: '0.75rem',
          borderRadius: 6,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: colors.textMuted,
          '&:hover': {
            backgroundColor: colors.bgGray,
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
          color: colors.textPrimary,
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
          fontSize: '0.8125rem',
          borderBottom: `1px solid ${colors.bgGray}`,
        },
        head: {
          fontWeight: 600,
          fontSize: '0.6875rem',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          color: colors.textMuted,
          backgroundColor: colors.bgLight,
          padding: '14px 20px',
          borderBottom: `1px solid ${colors.borderLight}`,
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: colors.bgHover,
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
          backgroundColor: colors.bgLight,
          borderTop: `1px solid ${colors.borderLight}`,
        },
        toolbar: {
          padding: '16px 20px',
          minHeight: 'auto',
        },
        selectLabel: {
          fontSize: '0.8125rem',
          color: colors.textMuted,
        },
        displayedRows: {
          fontSize: '0.8125rem',
          color: colors.textMuted,
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
              borderColor: colors.primary,
              borderWidth: 1,
              boxShadow: `0 0 0 3px ${alpha(colors.primary, 0.1)}`,
            },
          },
          '& .MuiInputBase-input': {
            padding: '10px 14px',
            fontSize: '0.875rem',
          },
          '& .MuiInputBase-input::placeholder': {
            color: colors.textMuted,
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
            borderColor: colors.primary,
            borderWidth: 1,
            boxShadow: `0 0 0 3px ${alpha(colors.primary, 0.1)}`,
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
            color: colors.primary,
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
            color: colors.textPrimary,
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
          backgroundColor: colors.primary,
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
            color: colors.textPrimary,
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
          color: colors.textMuted,
        },
        separator: {
          margin: '0 8px',
        },
      },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          color: colors.primary,
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
          backgroundColor: colors.primary,
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
          backgroundColor: colors.primary,
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
          backgroundColor: colors.primary,
          '&:hover': {
            backgroundColor: colors.primaryDark,
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
            backgroundColor: colors.primaryBg,
            '&:hover': {
              backgroundColor: colors.primaryBg,
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
