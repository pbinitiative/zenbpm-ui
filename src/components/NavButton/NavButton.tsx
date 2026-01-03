import { Link as RouterLink } from 'react-router-dom';
import { Button } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

interface NavButtonProps {
  /** The URL to navigate to */
  to: string;
  /** The button label */
  children: React.ReactNode;
}

export const NavButton = ({ to, children }: NavButtonProps) => {
  return (
    <Button
      component={RouterLink}
      to={to}
      variant="outlined"
      size="small"
      endIcon={<ArrowForwardIcon />}
      color={"primary"}
      sx={{
        justifyContent: 'space-between',
      }}
    >
      {children}
    </Button>
  );
};
