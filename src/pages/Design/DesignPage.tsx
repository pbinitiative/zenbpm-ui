import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ns } from '@base/i18n';
import { Box, Card, CardActionArea, CardContent, Typography } from '@mui/material';
import { themeColors } from '@base/theme';

// Simple BPMN process illustration
const ProcessIllustration = () => (
  <Box component="svg" viewBox="0 0 280 120" sx={{ width: '100%', height: 120 }}>
    {/* Start Event */}
    <circle cx="30" cy="60" r="15" fill="none" stroke={themeColors.design.bpmnPrimary} strokeWidth="2" />
    <circle cx="30" cy="60" r="5" fill={themeColors.design.bpmnPrimary} />

    {/* Arrow 1 */}
    <line x1="45" y1="60" x2="70" y2="60" stroke={themeColors.design.bpmnSecondary} strokeWidth="1.5" />
    <polygon points="70,55 80,60 70,65" fill={themeColors.design.bpmnSecondary} />

    {/* Task 1 */}
    <rect x="80" y="40" width="50" height="40" rx="5" fill={themeColors.design.bpmnBg} stroke={themeColors.design.bpmnPrimary} strokeWidth="1.5" />
    <text x="105" y="65" textAnchor="middle" fontSize="10" fill={themeColors.design.bpmnPrimary}>
      Task
    </text>

    {/* Arrow 2 */}
    <line x1="130" y1="60" x2="155" y2="60" stroke={themeColors.design.bpmnSecondary} strokeWidth="1.5" />
    <polygon points="155,55 165,60 155,65" fill={themeColors.design.bpmnSecondary} />

    {/* Gateway */}
    <polygon points="185,35 210,60 185,85 160,60" fill={themeColors.design.dmnBg} stroke={themeColors.design.dmnPrimary} strokeWidth="1.5" />
    <text x="185" y="64" textAnchor="middle" fontSize="14" fill={themeColors.design.dmnPrimary}>
      X
    </text>

    {/* Arrow 3 */}
    <line x1="210" y1="60" x2="235" y2="60" stroke={themeColors.design.bpmnSecondary} strokeWidth="1.5" />
    <polygon points="235,55 245,60 235,65" fill={themeColors.design.bpmnSecondary} />

    {/* End Event */}
    <circle cx="260" cy="60" r="15" fill="none" stroke={themeColors.design.decisionRed} strokeWidth="3" />
  </Box>
);

// Simple DMN decision table illustration
const DecisionIllustration = () => (
  <Box component="svg" viewBox="0 0 280 120" sx={{ width: '100%', height: 120 }}>
    {/* Table outline */}
    <rect x="40" y="20" width="200" height="80" fill={themeColors.bgWhite} stroke={themeColors.design.decisionPurple} strokeWidth="1.5" rx="3" />

    {/* Header row */}
    <rect x="40" y="20" width="200" height="25" fill={themeColors.design.decisionPurpleBg} stroke={themeColors.design.decisionPurple} strokeWidth="1.5" rx="3" />
    <line x1="40" y1="45" x2="240" y2="45" stroke={themeColors.design.decisionPurple} strokeWidth="1" />

    {/* Column dividers */}
    <line x1="110" y1="20" x2="110" y2="100" stroke={themeColors.design.decisionPurple} strokeWidth="1" />
    <line x1="175" y1="20" x2="175" y2="100" stroke={themeColors.design.decisionPurple} strokeWidth="1" />

    {/* Row dividers */}
    <line x1="40" y1="65" x2="240" y2="65" stroke={themeColors.design.decisionPurpleLight} strokeWidth="1" />
    <line x1="40" y1="85" x2="240" y2="85" stroke={themeColors.design.decisionPurpleLight} strokeWidth="1" />

    {/* Header text */}
    <text x="75" y="37" textAnchor="middle" fontSize="10" fill={themeColors.design.decisionPurple} fontWeight="500">
      Input
    </text>
    <text x="142" y="37" textAnchor="middle" fontSize="10" fill={themeColors.design.decisionPurple} fontWeight="500">
      Input
    </text>
    <text x="207" y="37" textAnchor="middle" fontSize="10" fill={themeColors.design.decisionPurple} fontWeight="500">
      Output
    </text>

    {/* Data cells */}
    <text x="75" y="57" textAnchor="middle" fontSize="9" fill={themeColors.design.iconGray}>
      &gt; 1000
    </text>
    <text x="142" y="57" textAnchor="middle" fontSize="9" fill={themeColors.design.iconGray}>
      VIP
    </text>
    <text x="207" y="57" textAnchor="middle" fontSize="9" fill={themeColors.design.checkGreen}>
      10%
    </text>

    <text x="75" y="77" textAnchor="middle" fontSize="9" fill={themeColors.design.iconGray}>
      &gt; 500
    </text>
    <text x="142" y="77" textAnchor="middle" fontSize="9" fill={themeColors.design.iconGray}>
      Regular
    </text>
    <text x="207" y="77" textAnchor="middle" fontSize="9" fill={themeColors.design.checkGreen}>
      5%
    </text>

    <text x="75" y="97" textAnchor="middle" fontSize="9" fill={themeColors.design.iconGray}>
      -
    </text>
    <text x="142" y="97" textAnchor="middle" fontSize="9" fill={themeColors.design.iconGray}>
      -
    </text>
    <text x="207" y="97" textAnchor="middle" fontSize="9" fill={themeColors.design.checkGreen}>
      0%
    </text>
  </Box>
);

export const DesignPage = () => {
  const { t } = useTranslation([ns.common, ns.designer]);
  const navigate = useNavigate();

  const handleProcessClick = useCallback(() => {
    navigate('/designer/process');
  }, [navigate]);

  const handleDecisionClick = useCallback(() => {
    navigate('/designer/decision');
  }, [navigate]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minHeight: 'calc(100vh - 200px)',
        pt: 6,
      }}
    >
      <Typography variant="h4" sx={{ mb: 6, fontWeight: 600, textAlign: 'center' }}>
        {t('designer:title')}
      </Typography>

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 4,
          justifyContent: 'center',
          maxWidth: 900,
          width: '100%',
          px: 2,
        }}
      >
        {/* Process Card */}
        <Card
          sx={{
            flex: 1,
            maxWidth: 400,
            boxShadow: 3,
            border: '1px solid',
            borderColor: 'divider',
            transition: 'transform 0.2s, box-shadow 0.2s',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: 8,
            },
          }}
        >
          <CardActionArea onClick={handleProcessClick} disableRipple sx={{ height: '100%' }}>
            <CardContent
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                py: 4,
                px: 3,
              }}
            >
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
                {t('designer:cards.process.title')}
              </Typography>

              <Box
                sx={{
                  width: '100%',
                  bgcolor: 'grey.50',
                  borderRadius: 2,
                  p: 2,
                  mb: 3,
                }}
              >
                <ProcessIllustration />
              </Box>

              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ textAlign: 'center', lineHeight: 1.6 }}
              >
                {t('designer:cards.process.description')}
              </Typography>
            </CardContent>
          </CardActionArea>
        </Card>

        {/* Decision Card */}
        <Card
          sx={{
            flex: 1,
            maxWidth: 400,
            boxShadow: 3,
            border: '1px solid',
            borderColor: 'divider',
            transition: 'transform 0.2s, box-shadow 0.2s',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: 8,
            },
          }}
        >
          <CardActionArea onClick={handleDecisionClick} disableRipple sx={{ height: '100%' }}>
            <CardContent
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                py: 4,
                px: 3,
              }}
            >
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
                {t('designer:cards.decision.title')}
              </Typography>

              <Box
                sx={{
                  width: '100%',
                  bgcolor: 'grey.50',
                  borderRadius: 2,
                  p: 2,
                  mb: 3,
                }}
              >
                <DecisionIllustration />
              </Box>

              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ textAlign: 'center', lineHeight: 1.6 }}
              >
                {t('designer:cards.decision.description')}
              </Typography>
            </CardContent>
          </CardActionArea>
        </Card>
      </Box>
    </Box>
  );
};
