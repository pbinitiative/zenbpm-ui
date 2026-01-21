import { useRef, useEffect, useState, useCallback } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Typography, IconButton, Link } from '@mui/material';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import type { ConsoleMessage, ConsoleMessageType } from '../types';

interface ConsolePanelProps {
  messages: ConsoleMessage[];
  open: boolean;
  onClear: () => void;
  onClose: () => void;
}

const MIN_HEIGHT = 100;
const MAX_HEIGHT = 400;
const DEFAULT_HEIGHT = 180;

const getMessageIcon = (type: ConsoleMessageType) => {
  switch (type) {
    case 'success':
      return <CheckCircleOutlineIcon fontSize="small" sx={{ color: 'success.main' }} />;
    case 'error':
      return <ErrorOutlineIcon fontSize="small" sx={{ color: 'error.main' }} />;
    case 'warning':
      return <WarningAmberIcon fontSize="small" sx={{ color: 'warning.main' }} />;
    case 'info':
    default:
      return <InfoOutlinedIcon fontSize="small" sx={{ color: 'info.main' }} />;
  }
};

const getMessageColor = (type: ConsoleMessageType) => {
  switch (type) {
    case 'success':
      return 'success.main';
    case 'error':
      return 'error.main';
    case 'warning':
      return 'warning.main';
    case 'info':
    default:
      return 'info.main';
  }
};

const formatTimestamp = (date: Date) => {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};

export const ConsolePanel = ({ messages, open, onClear, onClose }: ConsolePanelProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  // Handle drag start
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartY.current = e.clientY;
    dragStartHeight.current = height;
  }, [height]);

  // Handle drag move
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = dragStartY.current - e.clientY;
      const newHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, dragStartHeight.current + delta));
      setHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  if (!open) return null;

  return (
    <Box
      sx={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height,
        bgcolor: 'background.paper',
        borderTop: 2,
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 10,
        boxShadow: '0 -4px 12px rgba(0,0,0,0.1)',
      }}
    >
      {/* Drag handle */}
      <Box
        onMouseDown={handleDragStart}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 8,
          cursor: 'ns-resize',
          bgcolor: 'grey.100',
          borderBottom: 1,
          borderColor: 'divider',
          '&:hover': {
            bgcolor: 'grey.200',
          },
        }}
      >
        <DragHandleIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
      </Box>

      {/* Console header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1.5,
          py: 0.5,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'grey.50',
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Console
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconButton
            size="small"
            onClick={onClear}
            disabled={messages.length === 0}
            sx={{ p: 0.5 }}
            title="Clear console"
          >
            <ClearAllIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={onClose}
            sx={{ p: 0.5 }}
            title="Close console"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Console messages */}
      <Box
        ref={scrollRef}
        sx={{
          flex: 1,
          overflow: 'auto',
          fontFamily: 'monospace',
          fontSize: '0.75rem',
          p: 1,
          bgcolor: 'grey.50',
        }}
      >
        {messages.length === 0 ? (
          <Typography variant="caption" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
            No messages yet...
          </Typography>
        ) : (
          messages.map((msg) => (
            <Box
              key={msg.id}
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1,
                mb: 0.5,
                '&:last-child': { mb: 0 },
              }}
            >
              {getMessageIcon(msg.type)}
              <Typography
                variant="caption"
                sx={{
                  color: 'text.disabled',
                  fontFamily: 'monospace',
                  whiteSpace: 'nowrap',
                }}
              >
                [{formatTimestamp(msg.timestamp)}]
              </Typography>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: getMessageColor(msg.type),
                    fontFamily: 'monospace',
                    wordBreak: 'break-word',
                  }}
                >
                  {msg.message}
                </Typography>
                {msg.link && (
                  <Link
                    component={RouterLink}
                    to={msg.link.url}
                    sx={{
                      ml: 1,
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.5,
                    }}
                  >
                    {msg.link.text}
                    <OpenInNewIcon sx={{ fontSize: 12 }} />
                  </Link>
                )}
                {msg.details && (
                  <Typography
                    variant="caption"
                    component="pre"
                    sx={{
                      color: 'text.secondary',
                      fontFamily: 'monospace',
                      mt: 0.5,
                      p: 1,
                      bgcolor: 'grey.100',
                      borderRadius: 1,
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      m: 0,
                      fontSize: '0.7rem',
                    }}
                  >
                    {msg.details}
                  </Typography>
                )}
              </Box>
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
};
