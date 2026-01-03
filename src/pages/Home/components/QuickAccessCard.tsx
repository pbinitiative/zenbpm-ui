import { Box, Typography, Paper, Skeleton } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { themeColors } from '@base/theme';

interface StatItem {
  label: string;
  value: number | undefined;
  isLoading: boolean;
}

export interface QuickAccessCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  path: string;
  stats?: StatItem[];
}

export const QuickAccessCard = ({ icon, title, description, path, stats }: QuickAccessCardProps) => {
  const navigate = useNavigate();

  return (
    <Paper
      sx={{
        p: 3,
        cursor: 'pointer',
        borderRadius: '12px',
        transition: 'all 0.15s ease',
        border: `1px solid ${themeColors.borderLight}`,
        bgcolor: themeColors.bgWhite,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        '&:hover': {
          borderColor: themeColors.primary,
          bgcolor: themeColors.bgWhite,
          '& .card-icon': {
            color: themeColors.primary,
          },
          '& .card-title': {
            color: themeColors.primary,
          },
        },
      }}
      onClick={() => navigate(path)}
      data-testid={`quick-access-card-${path.replace('/', '')}`}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
        <Box
          className="card-icon"
          sx={{
            color: themeColors.textMuted,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.15s ease',
          }}
        >
          {icon}
        </Box>
        <Typography
          className="card-title"
          sx={{
            fontWeight: 600,
            fontSize: '1rem',
            color: themeColors.textPrimary,
            transition: 'color 0.15s ease',
          }}
        >
          {title}
        </Typography>
      </Box>
      <Typography
        sx={{
          fontSize: '0.875rem',
          color: themeColors.textMuted,
          mb: 2,
          flexGrow: 1,
        }}
      >
        {description}
      </Typography>
      {stats && stats.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            gap: 3,
            pt: 2,
            borderTop: `1px solid ${themeColors.borderLight}`,
          }}
        >
          {stats.map((stat) => (
            <Box key={stat.label}>
              {stat.isLoading ? (
                <Skeleton width={40} height={32} />
              ) : (
                <Typography
                  sx={{
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: themeColors.textPrimary,
                    lineHeight: 1.2,
                  }}
                >
                  {stat.value?.toLocaleString() ?? '-'}
                </Typography>
              )}
              <Typography
                sx={{
                  fontSize: '0.75rem',
                  color: themeColors.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                {stat.label}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Paper>
  );
};
