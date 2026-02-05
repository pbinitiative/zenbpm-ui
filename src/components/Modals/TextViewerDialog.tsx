import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, IconButton, Tooltip } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import React, { useState } from 'react';

export interface TextViewerDialogProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  text: string;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export const TextViewerDialog: React.FC<TextViewerDialogProps> = ({ open, onClose, title, text, maxWidth = 'lg' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth={maxWidth} fullWidth>
      {title ? (
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>{title}</Box>
          <Tooltip title={copied ? 'Copied' : 'Copy'}>
            <IconButton onClick={handleCopy} size="small" color={copied ? 'success' : 'default'}>
              {copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </DialogTitle>
      ) : null}
      <DialogContent>
        <Box
          component="pre"
          sx={{
            m: 0,
            p: 2,
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            bgcolor: 'grey.100',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'grey.300',
            fontFamily: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, monospace',
            fontSize: '0.8125rem',
            lineHeight: 1.5,
          }}
        >
          {text}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
