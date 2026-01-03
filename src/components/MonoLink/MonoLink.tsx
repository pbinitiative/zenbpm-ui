import { Link as RouterLink } from 'react-router-dom';
import { Link, Box } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { themeColors } from '../../base/theme';

interface MonoLinkProps {
  /** The URL to navigate to */
  to: string;
  /** The text/content to display */
  children: React.ReactNode;
}

export const MonoLink = ({ to, children }: MonoLinkProps) => {
  return (
    <Link
      component={RouterLink}
      to={to}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        fontFamily: "'SF Mono', Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
        fontSize: '0.6875rem',
        color: themeColors.primary,
        textDecoration: 'none',
        '&:hover': {
          textDecoration: 'underline',
        },
      }}
    >
      <Box component="span">{children}</Box>
      <OpenInNewIcon sx={{ fontSize: '0.75rem', opacity: 0.7 }} />
    </Link>
  );
};
