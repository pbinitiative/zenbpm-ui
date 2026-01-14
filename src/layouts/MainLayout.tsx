import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import RuleIcon from '@mui/icons-material/Rule';
import WarningIcon from '@mui/icons-material/Warning';
import { useIncidentCount } from '@base/contexts';

const navItems = [
  {
    labelKey: 'navigation.processes' as const,
    path: '/processes',
    icon: <AccountTreeIcon />,
  },
  {
    labelKey: 'navigation.decisions' as const,
    path: '/decisions',
    icon: <RuleIcon />,
  },
  {
    labelKey: 'navigation.incidents' as const,
    path: '/incidents',
    icon: <WarningIcon />,
  },
];

// Logo component - green dot + ZenBPM text
interface LogoProps {
  showText?: boolean;
  onClick: () => void;
  appName: string;
}

const Logo = ({ showText = true, onClick, appName }: LogoProps) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1.25,
      cursor: 'pointer',
      flexShrink: 0,
    }}
    onClick={onClick}
  >
    {/* Green dot */}
    <Box
      sx={{
        width: 8,
        height: 8,
        bgcolor: 'primary.main',
        borderRadius: '50%',
      }}
    />
    {showText && (
      <Typography
        sx={{
          fontWeight: 700,
          fontSize: '1.125rem',
          color: 'text.primary',
          letterSpacing: '-0.5px',
        }}
      >
        {appName}
      </Typography>
    )}
  </Box>
);

export const MainLayout = () => {
  const { t } = useTranslation([ns.common]);
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const { unresolvedCount } = useIncidentCount();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavClick = (path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const isActivePath = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  // Check if current route should use full-width layout (minimal padding)
  const isFullWidthRoute = location.pathname.startsWith('/designer');

  // Check if current route is a detail page (compact padding)
  const isDetailRoute =
    /^\/process-definitions\/[^/]+/.test(location.pathname) ||
    /^\/process-instances\/[^/]+/.test(location.pathname) ||
    /^\/decision-definitions\/[^/]+/.test(location.pathname) ||
    /^\/decision-instances\/[^/]+/.test(location.pathname);

  const appName = t('appName');
  const handleLogoClick = () => handleNavClick('/');

  // Mobile drawer content
  const mobileDrawerContent = (
    <Box sx={{ width: 280 }}>
      <Toolbar sx={{ px: 2.5 }}>
        <Logo onClick={handleLogoClick} appName={appName} />
      </Toolbar>
      <List>
        {navItems.map((item) => {
          const isIncidents = item.path === '/incidents';
          const showBadge = isIncidents && unresolvedCount > 0;

          return (
            <ListItem key={item.path} disablePadding>
              <ListItemButton
                selected={isActivePath(item.path)}
                onClick={() => handleNavClick(item.path)}
                sx={{
                  mx: 1.5,
                  borderRadius: 1,
                  '&.Mui-selected': {
                    bgcolor: 'primary.light',
                    color: 'primary.dark',
                    '& .MuiListItemIcon-root': {
                      color: 'primary.dark',
                    },
                    '&:hover': {
                      bgcolor: 'primary.light',
                    },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {t(item.labelKey)}
                      {showBadge && (
                        <Box
                          component="span"
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: 'error.main',
                            color: 'white',
                            fontSize: '10px',
                            fontWeight: 600,
                            minWidth: 18,
                            height: 18,
                            borderRadius: '9px',
                            ml: 0.75,
                            px: '5px',
                          }}
                        >
                          {unresolvedCount}
                        </Box>
                      )}
                    </Box>
                  }
                  primaryTypographyProps={{
                    fontSize: '0.875rem',
                    fontWeight: 500,
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Header */}
      <AppBar position="sticky">
        <Toolbar
          sx={{
            gap: 6,
            justifyContent: 'space-between',
          }}
        >
          {/* Left section: Logo and Navigation */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Mobile menu button */}
            {isMobile && (
              <IconButton
                color="inherit"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ mr: -1 }}
              >
                <MenuIcon />
              </IconButton>
            )}

            {/* Logo */}
            <Logo showText={!isMobile || !mobileOpen} onClick={handleLogoClick} appName={appName} />

            {/* Desktop Navigation */}
            {!isMobile && (
              <Box
                component="nav"
                sx={{
                  display: 'flex',
                  gap: 4,
                }}
              >
                {navItems.map((item) => {
                  const isIncidents = item.path === '/incidents';
                  const showBadge = isIncidents && unresolvedCount > 0;

                  return (
                    <Button
                      key={item.path}
                      onClick={() => handleNavClick(item.path)}
                      disableRipple
                      sx={{
                        px: 0,
                        py: 0.5,
                        minWidth: 'auto',
                        color: isActivePath(item.path) ? 'text.primary' : 'text.secondary',
                        fontWeight: 500,
                        fontSize: '0.875rem',
                        borderRadius: 0,
                        bgcolor: 'transparent',
                        '&:hover': {
                          bgcolor: 'transparent',
                          color: 'text.primary',
                        },
                      }}
                    >
                      {t(item.labelKey)}
                      {showBadge && (
                        <Box
                          component="span"
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: 'error.main',
                            color: 'white',
                            fontSize: '10px',
                            fontWeight: 600,
                            minWidth: 18,
                            height: 18,
                            borderRadius: '9px',
                            ml: 0.75,
                            px: '5px',
                          }}
                        >
                          {unresolvedCount}
                        </Box>
                      )}
                    </Button>
                  );
                })}
              </Box>
            )}
          </Box>

          {/* Right section: Design button, Search and Avatar */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
            {/* Design Button */}
            <Button
              onClick={() => handleNavClick('/designer')}
              sx={{
                bgcolor: 'primary.main',
                color: 'white',
                fontWeight: 600,
                fontSize: '0.875rem',
                px: 2,
                py: 0.75,
                borderRadius: 1,
                textTransform: 'none',
                '&:hover': {
                  bgcolor: 'primary.dark',
                },
              }}
            >
              {t('navigation.design')}
            </Button>

            {/* Search */}
            <TextField
              size="small"
              placeholder={t('search.placeholder')}
              sx={{
                width: { xs: 160, sm: 280 },
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'grey.100',
                  border: 'none',
                  '& fieldset': {
                    border: 'none',
                  },
                  '&:hover': {
                    bgcolor: 'grey.200',
                  },
                  '&.Mui-focused': {
                    bgcolor: 'grey.200',
                    boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.2)',
                  },
                },
                '& .MuiInputBase-input': {
                  fontSize: '0.875rem',
                  py: 1.25,
                  px: 2,
                  '&::placeholder': {
                    color: 'text.secondary',
                    opacity: 1,
                  },
                },
              }}
            />

            {/* Avatar */}
            <Avatar
              sx={{
                width: 32,
                height: 32,
                bgcolor: 'primary.main',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              JD
            </Avatar>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            border: 'none',
          },
        }}
      >
        {mobileDrawerContent}
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: 'background.default',
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        <Box
          sx={isFullWidthRoute ? {
            py: 1,
            px: 1,
          } : isDetailRoute ? {
            py: 2,
            px: { xs: 2, sm: 2, md: 3 },
            maxWidth: 1600,
            mx: 'auto',
          } : {
            py: 5,
            px: { xs: 2, sm: 3, md: 5 },
            maxWidth: 1400,
            mx: 'auto',
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};
