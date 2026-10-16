import { useMemo, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import { useAuth } from '@base/auth';
import { brandingQueryKey, defaultBranding, getBranding } from '@base/branding';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import RuleIcon from '@mui/icons-material/Rule';
import LogoutIcon from '@mui/icons-material/Logout';
import { BuildMetadataFooter } from '@components/BuildMetadataFooter';

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
];

// Logo component - green dot + ZenBPM text
interface LogoProps {
  showText?: boolean;
  onClick: () => void;
  appName: string;
  textColor: string;
  logoUrl: string | null;
  brandColor: string;
  headerHover: string;
}

const Logo = ({
  showText = true,
  onClick,
  appName,
  textColor,
  logoUrl,
  brandColor,
  headerHover,
}: LogoProps) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1.25,
      cursor: 'pointer',
      flexShrink: 0,
      borderRadius: 1,
      '&:hover': {
        bgcolor: headerHover,
      },
    }}
    onClick={onClick}
  >
    {logoUrl ? (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Box
          component="img"
          src={logoUrl}
          alt={appName}
          data-testid="header-logo"
          sx={{ height: 32, maxWidth: 180, objectFit: 'contain' }}
        />
        {/* Tenant logo replaces the ZenBPM mark, so keep the product attribution next to it */}
        {showText && (
          <Typography
            component="span"
            data-testid="header-powered-by"
            sx={{
              fontSize: '0.625rem',
              lineHeight: 1.2,
              color: textColor,
              whiteSpace: 'nowrap',
            }}
          >
            powered by ZenBPM
          </Typography>
        )}
      </Box>
    ) : (
      <>
        <Box
          sx={{
            width: 8,
            height: 8,
            bgcolor: brandColor,
            borderRadius: '50%',
          }}
        />
        {showText && (
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: '1.125rem',
              color: textColor,
              letterSpacing: '-0.5px',
            }}
          >
            {appName}
          </Typography>
        )}
      </>
    )}
  </Box>
);

export const MainLayout = () => {
  const { t } = useTranslation([ns.common, ns.auth]);
  const { data: branding = defaultBranding } = useQuery({
    queryKey: brandingQueryKey,
    queryFn: getBranding,
  });
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<HTMLElement | null>(null);

  const userInitials = useMemo(() => {
    if (!user) return 'JD';
    if (user.given_name && user.family_name) {
      return `${user.given_name[0]}${user.family_name[0]}`.toUpperCase();
    }
    if (user.name) {
      const parts = user.name.split(' ');
      return parts.length >= 2
        ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
        : user.name.substring(0, 2).toUpperCase();
    }
    return 'U';
  }, [user]);

  const handleLogout = () => {
    setUserMenuAnchor(null);
    void logout();
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavClick = (path: string) => {
    void navigate(path);
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
  const headerBackground = branding.headerBackground;
  const headerTextColor = branding.headerTextColor;
  const logoProps = {
    appName,
    textColor: headerTextColor,
    logoUrl: branding.logoUrl,
    brandColor: branding.brandColor,
    headerHover: branding.headerHover,
  };

  // Mobile drawer content
  const mobileDrawerContent = (
    <Box sx={{ width: 280 }}>
      <Toolbar sx={{ px: 2.5, bgcolor: headerBackground, color: headerTextColor }}>
        <Logo onClick={handleLogoClick} {...logoProps} />
      </Toolbar>
      <List>
        {navItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              selected={isActivePath(item.path)}
              onClick={() => handleNavClick(item.path)}
              sx={{
                mx: 1.5,
                borderRadius: `${branding.menuRadius}px`,
                color: isActivePath(item.path) ? branding.menuActiveColor : branding.menuInactiveColor,
                bgcolor: isActivePath(item.path) ? branding.menuActiveBackground : 'transparent',
                '&:hover': {
                  bgcolor: isActivePath(item.path)
                    ? branding.menuActiveHoverBackground
                    : branding.menuInactiveHoverBackground,
                  color: isActivePath(item.path) ? branding.menuActiveHoverColor : branding.menuInactiveHoverColor,
                },
                '&.Mui-selected': {
                  bgcolor: branding.menuActiveBackground,
                  color: branding.menuActiveColor,
                  '&:hover': {
                    bgcolor: branding.menuActiveHoverBackground,
                    color: branding.menuActiveHoverColor,
                  },
                },
                '& .MuiListItemIcon-root, & .MuiTypography-root': {
                  color: 'inherit',
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={t(item.labelKey)}
                slotProps={{
                  primary: {
                    sx: {
                      fontSize: `${branding.menuFontSize}px`,
                      fontWeight: isActivePath(item.path) ? branding.menuActiveFontWeight : branding.menuFontWeight,
                      color: 'inherit',
                    },
                  },
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Header */}
      <AppBar
        position="sticky"
        sx={{
          bgcolor: headerBackground,
          color: headerTextColor,
          borderBottom: `1px solid ${branding.headerBorder}`,
        }}
      >
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
                sx={{
                  mr: -1,
                  color: headerTextColor,
                  '&:hover': { bgcolor: branding.headerHover },
                }}
              >
                <MenuIcon />
              </IconButton>
            )}

            {/* Logo */}
            <Logo showText={!isMobile || !mobileOpen} onClick={handleLogoClick} {...logoProps} />

            {/* Desktop Navigation */}
            {!isMobile && (
              <Box
                component="nav"
                sx={{
                  display: 'flex',
                  gap: 4,
                }}
              >
                {navItems.map((item) => (
                  <Button
                    key={item.path}
                    onClick={() => handleNavClick(item.path)}
                    disableRipple
                    sx={{
                      px: 1.5,
                      py: 0.75,
                      minWidth: 'auto',
                      color: isActivePath(item.path) ? branding.menuActiveColor : branding.menuInactiveColor,
                      fontWeight: isActivePath(item.path) ? branding.menuActiveFontWeight : branding.menuFontWeight,
                      fontSize: `${branding.menuFontSize}px`,
                      borderRadius: `${branding.menuRadius}px`,
                      bgcolor: isActivePath(item.path) ? branding.menuActiveBackground : 'transparent',
                      '&:hover': {
                        bgcolor: isActivePath(item.path)
                          ? branding.menuActiveHoverBackground
                          : branding.menuInactiveHoverBackground,
                        color: isActivePath(item.path) ? branding.menuActiveHoverColor : branding.menuInactiveHoverColor,
                      },
                    }}
                  >
                    {t(item.labelKey)}
                  </Button>
                ))}
              </Box>
            )}
          </Box>

          {/* Right section: reserved search space and Avatar */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
            {/* Keep header spacing while global search is unavailable. */}
            <Box
              aria-hidden="true"
              data-testid="header-search-spacer"
              sx={{ display: { xs: 'none', md: 'block' }, width: 280, minWidth: 0, flexShrink: 1 }}
            />

            {/* Avatar + User Menu */}
            <Avatar
              data-testid="header-profile"
              role={user ? 'button' : undefined}
              tabIndex={user ? 0 : undefined}
              onClick={user ? (event) => setUserMenuAnchor(event.currentTarget) : undefined}
              onKeyDown={
                user
                  ? (event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setUserMenuAnchor(event.currentTarget);
                      }
                    }
                  : undefined
              }
              sx={{
                width: 32,
                height: 32,
                bgcolor: branding.brandColor,
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: user ? 'pointer' : 'default',
              }}
            >
              {userInitials}
            </Avatar>
            {user && (
              <Menu
                anchorEl={userMenuAnchor}
                open={Boolean(userMenuAnchor)}
                onClose={() => setUserMenuAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              >
                <MenuItem disabled>
                  <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500 }}>
                    {user.name ?? user.preferred_username ?? user.email ?? ''}
                  </Typography>
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleLogout}>
                  <ListItemIcon>
                    <LogoutIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>{t('auth:user.signOut')}</ListItemText>
                </MenuItem>
              </Menu>
            )}
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

      <BuildMetadataFooter />
    </Box>
  );
};
