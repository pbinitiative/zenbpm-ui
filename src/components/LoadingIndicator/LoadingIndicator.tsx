import { useState, useEffect, useRef } from 'react';
import { Box, CircularProgress, Fade } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

interface LoadingIndicatorProps {
  /** Current loading state */
  state: LoadingState;
  /** Size of the indicator (default: 20) */
  size?: number;
  /** How long to show the success/error state before hiding (ms, default: 1500) */
  successDuration?: number;
  /** Callback when success/error state finishes displaying */
  onComplete?: () => void;
}

export const LoadingIndicator = ({
  state,
  size = 20,
  successDuration = 1500,
  onComplete,
}: LoadingIndicatorProps) => {
  const [displayState, setDisplayState] = useState<LoadingState>(state);
  const prevStateRef = useRef(state);

  useEffect(() => {
    // Only update display state when prop changes
    if (prevStateRef.current !== state) {
      prevStateRef.current = state;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Syncing external prop with internal display state is intentional
      setDisplayState(state);
    }

    // Auto-hide success/error after duration
    if (state === 'success' || state === 'error') {
      const timer = setTimeout(() => {
        setDisplayState('idle');
        onComplete?.();
      }, successDuration);
      return () => clearTimeout(timer);
    }
  }, [state, successDuration, onComplete]);

  if (displayState === 'idle') {
    return null;
  }

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
      }}
    >
      <Fade in={displayState === 'loading'} unmountOnExit>
        <CircularProgress size={size} thickness={4} />
      </Fade>
      <Fade in={displayState === 'success'} unmountOnExit>
        <CheckCircleIcon
          sx={{
            fontSize: size,
            color: 'success.main',
            position: 'absolute',
          }}
        />
      </Fade>
      <Fade in={displayState === 'error'} unmountOnExit>
        <ErrorIcon
          sx={{
            fontSize: size,
            color: 'error.main',
            position: 'absolute',
          }}
        />
      </Fade>
    </Box>
  );
};
