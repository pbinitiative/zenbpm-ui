import { Link } from '@mui/material';
import { monoLinkSx } from './styles';

interface MonoLinkButtonProps {
  /** Called on click, for navigation within the current page */
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** The text/content to display */
  children: React.ReactNode;
  'data-testid'?: string;
}

/** A key which acts like `MonoLink` but runs a callback instead of following a URL. */
export const MonoLinkButton = ({ onClick, children, 'data-testid': testId }: MonoLinkButtonProps) => {
  return (
    <Link
      component="button"
      type="button"
      onClick={onClick}
      data-testid={testId}
      sx={{ ...monoLinkSx, textAlign: 'left' }}
    >
      {children}
    </Link>
  );
};
