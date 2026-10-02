import { Link as RouterLink } from 'react-router-dom';
import { Link, Box } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { monoLinkSx } from './styles';

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
      sx={monoLinkSx}
    >
      <Box component="span">{children}</Box>
      <OpenInNewIcon sx={{ fontSize: '0.75rem', opacity: 0.7 }} />
    </Link>
  );
};
