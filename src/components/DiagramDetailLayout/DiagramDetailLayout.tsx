import type { ReactNode } from 'react';
import { Box, Grid, Paper, Typography } from '@mui/material';

export interface DiagramDetailLayoutProps {
  /** Content for the left metadata panel (3 columns on desktop) */
  leftSection: ReactNode;
  /** Title for the left section */
  leftTitle: string;
  /** Content for the right diagram panel (9 columns on desktop) */
  rightSection: ReactNode;
  /** Title for the right section */
  rightTitle: string;
  /** Optional content for the bottom section (full width) */
  bottomSection?: ReactNode;
  /** Optional title for the bottom section */
  bottomTitle?: string;
  /** Optional floating action buttons */
  floatingActions?: ReactNode;
  /** Additional bottom padding when floating actions are present (default: 10 for FABs, 4 otherwise) */
  bottomPadding?: number;
}

/**
 * A reusable layout component for detail pages with diagram.
 * Provides a consistent two-column layout with metadata on the left,
 * diagram on the right, and an optional bottom section.
 *
 * On mobile, the diagram appears first for better UX.
 */
export const DiagramDetailLayout = ({
  leftSection,
  leftTitle,
  rightSection,
  rightTitle,
  bottomSection,
  bottomTitle,
  floatingActions,
  bottomPadding,
}: DiagramDetailLayoutProps) => {
  // Default padding: 10 if floating actions, 4 otherwise
  const pb = bottomPadding ?? (floatingActions ? 10 : 4);

  return (
    <Box sx={{ pb }}>
      <Grid container spacing={{ xs: 2, md: 3 }} sx={{ alignItems: 'stretch' }}>
        {/* Diagram - First on mobile for better UX */}
        <Grid size={{ xs: 12, md: 9 }} order={{ xs: 1, md: 2 }}>
          <Paper sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: '12px', height: '100%' }}>
            <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600, mb: 2 }}>
              {rightTitle}
            </Typography>
            {rightSection}
          </Paper>
        </Grid>

        {/* Metadata - Second on mobile */}
        <Grid size={{ xs: 12, md: 3 }} order={{ xs: 2, md: 1 }}>
          <Paper sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: '12px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom sx={{ fontSize: '1rem', fontWeight: 600 }}>
              {leftTitle}
            </Typography>
            {leftSection}
          </Paper>
        </Grid>
      </Grid>

      {/* Bottom section (full width) */}
      {bottomSection && (
        <Paper sx={{ mt: { xs: 2, md: 3 }, p: { xs: 1.5, sm: 2 }, borderRadius: '12px' }}>
          {bottomTitle && (
            <Typography variant="h6" gutterBottom sx={{ fontSize: '1rem', fontWeight: 600 }}>
              {bottomTitle}
            </Typography>
          )}
          {bottomSection}
        </Paper>
      )}

      {/* Floating Action Buttons */}
      {floatingActions && (
        <Box
          sx={{
            position: 'fixed',
            bottom: { xs: 16, sm: 24 },
            right: { xs: 16, sm: 24 },
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 1, sm: 1.5 },
          }}
        >
          {floatingActions}
        </Box>
      )}
    </Box>
  );
};
